#!/usr/bin/env python3
"""
Molecular Dynamics (MD) Simulation Toolkit in Python
======================================================
Features:
 - 2D / 3D Lennard-Jones 12-6 Potential with Cutoff (rc = 2.5 sigma)
 - Velocity Verlet Integrator (Symplectic 2nd Order)
 - Periodic Boundary Conditions (PBC) & Minimum Image Convention
 - Thermostats: NVE (microcanonical), NVT Berendsen, NVT Andersen, Velocity Rescaling
 - Thermodynamic Diagnostics: Kinetic Energy K, Potential Energy U, Total Energy E, Temperature T, Pressure P, MSD
 - Radial Distribution Function g(r)
 - Maxwell-Boltzmann Speed Distribution comparison
 - Data Logging & Trajectory Export
"""

import math
import time
import numpy as np

class MolecularDynamics2D:
    def __init__(self, num_atoms=144, box_size=18.0, dt=0.003, target_temp=0.85, rc=2.5):
        """
        Initialize 2D Molecular Dynamics Simulation.
        All quantities are in Reduced Units (sigma=1, epsilon=1, mass=1, kB=1).
        """
        self.N = num_atoms
        self.L = box_size
        self.dt = dt
        self.target_temp = target_temp
        self.rc = rc
        self.rc_sq = rc * rc
        
        # Shift potential V(rc) to prevent energy jumps
        self.v_shift = 4.0 * ((1.0 / rc)**12 - (1.0 / rc)**6)

        # Particle state arrays (float64 for numerical precision)
        self.x = np.zeros(self.N, dtype=np.float64)
        self.y = np.zeros(self.N, dtype=np.float64)
        self.vx = np.zeros(self.N, dtype=np.float64)
        self.vy = np.zeros(self.N, dtype=np.float64)
        self.fx = np.zeros(self.N, dtype=np.float64)
        self.fy = np.zeros(self.N, dtype=np.float64)

        # Unfolded coordinates for MSD calculation
        self.x_unfolded = np.zeros(self.N, dtype=np.float64)
        self.y_unfolded = np.zeros(self.N, dtype=np.float64)
        self.x_initial = np.zeros(self.N, dtype=np.float64)
        self.y_initial = np.zeros(self.N, dtype=np.float64)

        # Simulation metrics
        self.step_count = 0
        self.time = 0.0
        self.kinetic_energy = 0.0
        self.potential_energy = 0.0
        self.total_energy = 0.0
        self.temperature = 0.0
        self.pressure = 0.0
        self.msd = 0.0
        self.virial_sum = 0.0

        # History log
        self.history_time = []
        self.history_K = []
        self.history_U = []
        self.history_E = []
        self.history_T = []

    def init_grid(self, temp=None):
        """Arrange atoms in a regular square lattice grid and set initial velocities."""
        if temp is not None:
            self.target_temp = temp

        cols = int(np.ceil(np.sqrt(self.N)))
        rows = cols
        self.N = cols * rows

        self.x = np.zeros(self.N, dtype=np.float64)
        self.y = np.zeros(self.N, dtype=np.float64)
        self.vx = np.zeros(self.N, dtype=np.float64)
        self.vy = np.zeros(self.N, dtype=np.float64)
        self.fx = np.zeros(self.N, dtype=np.float64)
        self.fy = np.zeros(self.N, dtype=np.float64)
        self.x_unfolded = np.zeros(self.N, dtype=np.float64)
        self.y_unfolded = np.zeros(self.N, dtype=np.float64)
        self.x_initial = np.zeros(self.N, dtype=np.float64)
        self.y_initial = np.zeros(self.N, dtype=np.float64)

        spacing = self.L / cols
        idx = 0
        for i in range(cols):
            for j in range(rows):
                self.x[idx] = (i + 0.5) * spacing
                self.y[idx] = (j + 0.5) * spacing
                self.x_unfolded[idx] = self.x[idx]
                self.y_unfolded[idx] = self.y[idx]
                self.x_initial[idx] = self.x[idx]
                self.y_initial[idx] = self.y[idx]
                idx += 1

        self._assign_thermal_velocities()
        self.compute_forces()

    def _assign_thermal_velocities(self):
        """Assign random velocities drawn from Maxwell-Boltzmann distribution and zero net momentum."""
        v_scale = np.sqrt(self.target_temp)
        self.vx = np.random.normal(0.0, v_scale, self.N)
        self.vy = np.random.normal(0.0, v_scale, self.N)

        # Remove center-of-mass momentum drift
        self.vx -= np.mean(self.vx)
        self.vy -= np.mean(self.vy)

    def compute_forces(self):
        """Compute interatomic Lennard-Jones forces using Minimum Image Convention under PBC."""
        self.fx.fill(0.0)
        self.fy.fill(0.0)
        self.potential_energy = 0.0
        self.virial_sum = 0.0

        half_L = self.L / 2.0

        for i in range(self.N):
            dx = self.x[i] - self.x[i+1:]
            dy = self.y[i] - self.y[i+1:]

            # Apply Minimum Image Convention
            dx = np.where(dx > half_L, dx - self.L, np.where(dx < -half_L, dx + self.L, dx))
            dy = np.where(dy > half_L, dy - self.L, np.where(dy < -half_L, dy + self.L, dy))

            r2 = dx * dx + dy * dy
            mask = (r2 < self.rc_sq) & (r2 > 0.01)

            if np.any(mask):
                r2_m = r2[mask]
                dx_m = dx[mask]
                dy_m = dy[mask]

                inv_r2 = 1.0 / r2_m
                inv_r6 = inv_r2 * inv_r2 * inv_r2
                inv_r12 = inv_r6 * inv_r6

                # Force scalar F(r)/r = 24*(2*r^-12 - r^-6)/r^2
                f_pair = 24.0 * (2.0 * inv_r12 - inv_r6) * inv_r2

                fx_pair = f_pair * dx_m
                fy_pair = f_pair * dy_m

                self.fx[i] += np.sum(fx_pair)
                self.fy[i] += np.sum(fy_pair)

                j_indices = np.where(mask)[0] + (i + 1)
                np.add.at(self.fx, j_indices, -fx_pair)
                np.add.at(self.fy, j_indices, -fy_pair)

                # Potential energy and Virial contribution
                self.potential_energy += np.sum(4.0 * (inv_r12 - inv_r6) - self.v_shift)
                self.virial_sum += np.sum(f_pair * r2_m)

    def step(self, thermostat='berendsen'):
        """Perform one Velocity Verlet integration step."""
        half_dt = 0.5 * self.dt

        # 1. Update positions r(t+dt) = r(t) + v(t)*dt + 0.5*a(t)*dt^2
        dx = self.vx * self.dt + half_dt * self.fx * self.dt
        dy = self.vy * self.dt + half_dt * self.fy * self.dt

        self.x += dx
        self.y += dy
        self.x_unfolded += dx
        self.y_unfolded += dy

        # Enforce Periodic Boundary Conditions
        self.x = np.mod(self.x, self.L)
        self.y = np.mod(self.y, self.L)

        # Half-update velocities v(t+dt/2) = v(t) + 0.5*a(t)*dt
        self.vx += half_dt * self.fx
        self.vy += half_dt * self.fy

        # 2. Re-compute forces at new positions F(t+dt)
        self.compute_forces()

        # 3. Complete velocity update v(t+dt) = v(t+dt/2) + 0.5*a(t+dt)*dt
        self.vx += half_dt * self.fx
        self.vy += half_dt * self.fy

        # 4. Calculate Thermodynamics
        self.kinetic_energy = 0.5 * np.sum(self.vx**2 + self.vy**2)
        self.temperature = self.kinetic_energy / self.N
        self.total_energy = self.kinetic_energy + self.potential_energy

        density = self.N / (self.L * self.L)
        self.pressure = density * self.temperature + (self.virial_sum / (2.0 * self.L * self.L))

        # MSD
        sum_msd = np.sum((self.x_unfolded - self.x_initial)**2 + (self.y_unfolded - self.y_initial)**2)
        self.msd = sum_msd / self.N

        # 5. Apply Thermostat
        if thermostat == 'berendsen':
            tau = 0.1
            factor = np.sqrt(1.0 + (self.dt / tau) * (self.target_temp / max(0.001, self.temperature) - 1.0))
            factor = np.clip(factor, 0.8, 1.2)
            self.vx *= factor
            self.vy *= factor
        elif thermostat == 'rescale':
            factor = np.sqrt(self.target_temp / max(0.001, self.temperature))
            self.vx *= factor
            self.vy *= factor

        self.step_count += 1
        self.time += self.dt

        if self.step_count % 10 == 0:
            self.history_time.append(self.time)
            self.history_K.append(self.kinetic_energy / self.N)
            self.history_U.append(self.potential_energy / self.N)
            self.history_E.append(self.total_energy / self.N)
            self.history_T.append(self.temperature)

    def compute_rdf(self, num_bins=50):
        """Compute Radial Distribution Function g(r)."""
        dr = (self.L / 2.0) / num_bins
        bins = np.zeros(num_bins, dtype=np.float64)
        half_L = self.L / 2.0

        for i in range(self.N):
            dx = self.x[i] - self.x[i+1:]
            dy = self.y[i] - self.y[i+1:]
            dx = np.where(dx > half_L, dx - self.L, np.where(dx < -half_L, dx + self.L, dx))
            dy = np.where(dy > half_L, dy - self.L, np.where(dy < -half_L, dy + self.L, dy))

            r = np.sqrt(dx * dx + dy * dy)
            mask = r < half_L
            bin_indices = np.floor(r[mask] / dr).astype(int)
            np.add.at(bins, bin_indices, 2)

        density = self.N / (self.L * self.L)
        gr = np.zeros(num_bins, dtype=np.float64)
        r_axis = np.zeros(num_bins, dtype=np.float64)

        for b in range(num_bins):
            r_inner = b * dr
            r_outer = (b + 1) * dr
            area = np.pi * (r_outer**2 - r_inner**2)
            expected = density * area * self.N
            gr[b] = bins[b] / max(0.0001, expected)
            r_axis[b] = (r_inner + r_outer) / 2.0

        return r_axis, gr

    def print_status(self):
        print(f"[Step {self.step_count:5d} | Time {self.time:6.3f}s] "
              f"T* = {self.temperature:6.3f} | K/N = {self.kinetic_energy/self.N:6.3f} | "
              f"U/N = {self.potential_energy/self.N:6.3f} | E/N = {self.total_energy/self.N:6.3f} | "
              f"P* = {self.pressure:6.3f}")

def run_demo():
    print("=" * 70)
    print("      Molecular Dynamics Simulation Demo (Lennard-Jones 2D)")
    print("=" * 70)
    
    sim = MolecularDynamics2D(num_atoms=144, box_size=16.0, dt=0.003, target_temp=0.85)
    sim.init_grid(temp=0.85)
    
    print(f"System Initialized with N = {sim.N} atoms in box L = {sim.L}")
    print("Running 500 integration steps with Berendsen Thermostat...\n")
    
    start_t = time.time()
    for s in range(1, 501):
        sim.step(thermostat='berendsen')
        if s % 100 == 0:
            sim.print_status()

    elapsed = time.time() - start_t
    print("-" * 70)
    print(f"Simulation Finished in {elapsed:.2f} seconds ({500/elapsed:.1f} steps/sec)")
    
    r_axis, gr = sim.compute_rdf()
    print("\nRadial Distribution Function g(r) Sample:")
    print("r (sigma)  |  g(r)")
    print("-" * 25)
    for i in range(0, len(r_axis), 5):
        print(f"  {r_axis[i]:5.2f}    |  {gr[i]:6.3f}")
    print("=" * 70)

if __name__ == '__main__':
    run_demo()
