#!/usr/bin/env python3
# =========================================================================
#  03_migrate_legacy_data.py — Wayne IoT Server Legacy Data Migration Tool
#  將舊 MySQL 165 欄位寬表 (808 萬筆) 批次轉換匯入 TimescaleDB Hypertable
# =========================================================================

import os
import sys
import time
import json
import pymysql
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime

MYSQL_CONFIG = {
    'host': os.getenv('OLD_MYSQL_HOST', '127.0.0.1'),
    'port': int(os.getenv('OLD_MYSQL_PORT', '3306')),
    'user': os.getenv('OLD_MYSQL_USER', 'root'),
    'password': os.getenv('OLD_MYSQL_PASS', ''),
    'database': os.getenv('OLD_MYSQL_DB', 'wayne_legacy'),
    'cursorclass': pymysql.cursors.DictCursor
}

PG_CONFIG = {
    'host': os.getenv('NEW_PG_HOST', '127.0.0.1'),
    'port': int(os.getenv('NEW_PG_PORT', '5432')),
    'user': os.getenv('NEW_PG_USER', 'wayne_user'),
    'password': os.getenv('NEW_PG_PASS', 'Wayne_Secure_Timescale_2026!'),
    'database': os.getenv('NEW_PG_DB', 'wayne_iot'),
}

BATCH_SIZE = 5000

def migrate():
    print("=================================================================")
    print("🚀 Starting Wayne IoT Legacy Data Migration to TimescaleDB")
    print(f"📦 Batch Size: {BATCH_SIZE} records")
    print("=================================================================")

    try:
        my_conn = pymysql.connect(**MYSQL_CONFIG)
        pg_conn = psycopg2.connect(**PG_CONFIG)
        pg_cur = pg_conn.cursor()
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("💡 Note: Run this script when legacy MySQL instance is connected.")
        return

    with my_conn.cursor() as my_cur:
        my_cur.execute("SELECT COUNT(*) AS total FROM patterns")
        total_rows = my_cur.fetchone()['total']
        print(f"📊 Total Legacy Records to Migrate: {total_rows:,}")

        offset = 0
        migrated = 0
        start_time = time.time()

        while offset < total_rows:
            my_cur.execute(f"SELECT * FROM patterns ORDER BY created_at ASC LIMIT {BATCH_SIZE} OFFSET {offset}")
            rows = my_cur.fetchall()
            if not rows:
                break

            pg_tuples = []
            for row in rows:
                machine_id = row.get('machine_id', 0)
                cid = row.get('cid', 1)
                created_at = row.get('created_at', datetime.now())

                # Collect all AAA* sensor columns into JSON payload
                payload = {}
                for k, v in row.items():
                    if k.startswith('AAA') or k in ['AHTEMP', 'ALTEMP', 'BHTEMP', 'BLTEMP']:
                        if v is not None and v != '':
                            try:
                                payload[k] = float(v) if '.' in str(v) else int(v)
                            except ValueError:
                                payload[k] = v

                pg_tuples.append((
                    created_at,
                    machine_id,
                    cid,
                    json.dumps(payload),
                    created_at
                ))

            # Batch insert to TimescaleDB
            insert_query = """
                INSERT INTO sensor_data (time, machine_id, cid, payload, created_at)
                VALUES %s
                ON CONFLICT DO NOTHING;
            """
            execute_values(pg_cur, insert_query, pg_tuples)
            pg_conn.commit()

            offset += len(rows)
            migrated += len(rows)
            elapsed = time.time() - start_time
            rate = migrated / (elapsed or 1)
            print(f"✅ Migrated {migrated:,} / {total_rows:,} records ({migrated/total_rows*100:.1f}%) — {rate:.0f} rows/sec")

    pg_cur.close()
    pg_conn.close()
    my_conn.close()
    print("🎉 Migration completed successfully!")

if __name__ == '__main__':
    migrate()
