# 分子動力學模擬 (Molecular Dynamics Simulation)

這是一個完整且功能強大的 **分子動力學 (Molecular Dynamics, MD) 模擬系統**，包含：
1. **網頁互動式模擬器 (`index.html`)**：具備現代化 UI、物理引擎、動態控溫、相變觀察、即時能量圖表、麥克斯韋速度分佈、徑向分佈函數 $g(r)$ 與 LJ 勢能曲線。
2. **Python 物理引擎核心 (`md_simulation.py`)**：基於 NumPy 的二維 Lennard-Jones 系統，提供完整的熱力學診斷、數據記錄與軌跡計算。

---

## 物理原理與核心算法 (Physics & Numerical Methods)

### 1. Lennard-Jones (12-6) 勢能模型
用於描述非極性中性原子（如氬氣 Argon, 氪氣 Krypton）之間的相互作用力：

$$V(r) = 4\varepsilon \left[ \left(\frac{\sigma}{r}\right)^{12} - \left(\frac{\sigma}{r}\right)^6 \right]$$

- **無量綱歸一化單位 (Reduced Units)**：本系統採用 $\sigma=1, \varepsilon=1, m=1, k_B=1$。
- **截斷半徑與平移補償 (Force Cutoff & Potential Shift)**：設定截斷半徑 $r_c = 2.5\sigma$，並採用平移勢能 $V_{\text{shift}}(r) = V(r) - V(r_c)$ 確保能量在截斷處連續。
- **粒子間作用力**：
  $$F(r) = -\frac{dV}{dr} = \frac{24\varepsilon}{r^2} \left[ 2\left(\frac{\sigma}{r}\right)^{12} - \left(\frac{\sigma}{r}\right)^6 \right]$$

---

### 2. Velocity Verlet 數值積分算法
採用二階辛積分器 (Symplectic Integrator)，具有時間反演對稱性與卓越的長期能量守恆特性：

$$\vec{r}(t+\Delta t) = \vec{r}(t) + \vec{v}(t)\Delta t + \frac{1}{2}\vec{a}(t)\Delta t^2$$

$$\vec{v}\left(t+\frac{\Delta t}{2}\right) = \vec{v}(t) + \frac{1}{2}\vec{a}(t)\Delta t$$

$$\vec{a}(t+\Delta t) = \frac{\vec{F}(\vec{r}(t+\Delta t))}{m}$$

$$\vec{v}(t+\Delta t) = \vec{v}\left(t+\frac{\Delta t}{2}\right) + \frac{1}{2}\vec{a}(t+\Delta t)\Delta t$$

---

### 3. 週期性邊界條件 (PBC) 與最小鏡像法 (Minimum Image Convention)
為消除小系統的邊界效應（Wall Effects），採用正方形模擬盒 $\mathbf{L}$，當粒子跨越邊界時從另一側穿回。
粒子間相對距離向量採用最小鏡像修正：

$$\Delta x_{\text{real}} = \Delta x - L \cdot \text{round}\left(\frac{\Delta x}{L}\right)$$

---

### 4. 控溫儀與熱力學系綜 (Thermostats & Ensembles)
- **NVE (微正則系綜)**：無控溫儀，驗證 Velocity Verlet 的能量守恆。
- **NVT (Berendsen 控溫儀)**：通過弱偶合熱浴修正速度比例 $\lambda = \sqrt{1 + \frac{\Delta t}{\tau_T}\left(\frac{T_{\text{target}}}{T_{\text{current}}} - 1\right)}$。
- **NVT (Andersen 隨機碰撞控溫)**：模擬粒子與假想熱浴隨機碰撞，產生高斯分佈速率。
- **NVT (Direct Rescaling)**：直接縮放速率以快速達到目標溫度。

---

### 5. 結構與熱力學診斷數據
- **平均動能與溫度**：$K = \sum \frac{1}{2} m_i v_i^2$, $T^* = \frac{2K}{d \cdot N \cdot k_B}$ （二維系統 $d=2$）
- **維里壓強 (Virial Pressure)**：$P^* = \rho T^* + \frac{1}{2 V} \sum_{i < j} \vec{F}_{ij} \cdot \vec{r}_{ij}$
- **徑向分佈函數 (Radial Distribution Function, $g(r)$)**：衡量流體與晶格的長短程有序結構。
- **均方位移 (Mean Squared Displacement, MSD)**：$\text{MSD}(t) = \frac{1}{N} \sum_{i=1}^N |\vec{r}_i(t) - \vec{r}_i(0)|^2$，用於計算擴散係數。

---

## 快速開始與使用方式 (Usage Guide)

### 1. 運行 Web 互動模擬器
直接在瀏覽器開啟 [index.html](file:///c:/Users/win87/Desktop/%E5%80%8B%E4%BA%BA%E7%B6%B2%E7%AB%99/molecular_dynamics/index.html) 或使用本機 HTTP 伺服器：
```bash
python -m http.server 8000
```
在瀏覽器訪問 `http://localhost:8000/molecular_dynamics/` 即可進行互動操作：
- **選擇預設場景**：固體晶格 (Solid Grid)、晶格熔化 (Melting)、液體 (Liquid)、氣體擴散 (Gas Expansion)、熱衝擊 (Thermal Shock)、雙組分相分離 (Binary Mixture)、團簇碰撞 (Collision)。
- **互動操作**：使用滑鼠拖拽原子、局部雷射加熱、斥力推開或點擊新增原子。
- **觀測數據**：即時查看能量守恆曲線 ($K, U, E$)、麥克斯韋速率分佈、徑向分佈函數 $g(r)$ 與勢能曲線。

### 2. 運行 Python 終端模擬
在終端機執行：
```bash
python molecular_dynamics/md_simulation.py
```
將會進行 500 步的二維分子動力學積分計算，輸出即時熱力學數據與徑向分佈函數 $g(r)$ 採樣結果。
