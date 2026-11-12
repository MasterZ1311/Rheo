"""Database backup and recovery service using SQLite's online backup API."""

import logging
import sqlite3
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .. import config

logger = logging.getLogger(__name__)


def get_backups_dir() -> Path:
    """Return the directory where database backups are stored."""
    backups_dir = config.get_data_dir() / "backups"
    backups_dir.mkdir(parents=True, exist_ok=True)
    return backups_dir


def verify_database_integrity(db_file: Path | str) -> bool:
    """Run SQLite integrity and foreign key checks on a database file."""
    path = Path(db_file)
    if not path.exists() or path.stat().st_size == 0:
        return False

    try:
        conn = sqlite3.connect(str(path))
        try:
            cursor = conn.cursor()
            cursor.execute("PRAGMA integrity_check;")
            res = cursor.fetchone()
            if not res or res[0] != "ok":
                return False

            cursor.execute("PRAGMA foreign_key_check;")
            fk_violations = cursor.fetchall()
            return len(fk_violations) == 0
        finally:
            conn.close()
    except Exception as exc:
        logger.warning("Integrity check failed on %s: %s", db_file, exc)
        return False


def create_database_backup(backup_path: Optional[Path | str] = None, source_db: Optional[Path | str] = None) -> Path:
    """Create a consistent, WAL-safe snapshot of the active SQLite database.

    Uses Python's sqlite3 Connection.backup API to perform an online, non-blocking
    snapshot that captures uncheckpointed WAL pages without corrupting active writes.
    """
    db_path = Path(source_db) if source_db else config.get_db_path()
    if not db_path.exists():
        raise FileNotFoundError(f"Database file not found at {db_path}")

    if backup_path is None:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        target_file = get_backups_dir() / f"rheo_backup_{timestamp}.db"
    else:
        target_file = Path(backup_path)
        target_file.parent.mkdir(parents=True, exist_ok=True)

    # Use SQLite online backup API
    source_conn = sqlite3.connect(str(db_path), timeout=30.0)
    try:
        dest_conn = sqlite3.connect(str(target_file))
        try:
            source_conn.backup(dest_conn, pages=100)
        finally:
            dest_conn.close()
    finally:
        source_conn.close()

    # Verify backup integrity
    if not verify_database_integrity(target_file):
        target_file.unlink(missing_ok=True)
        raise RuntimeError("Created database backup failed PRAGMA integrity_check")

    logger.info("Successfully created database backup at %s", target_file)
    return target_file


def restore_database_backup(backup_file: Path | str, target_db_path: Optional[Path | str] = None) -> bool:
    """Safely restore a database from a backup file with rollback on failure.

    1. Validates that the backup file exists and passes integrity check.
    2. Takes a pre-restore safety snapshot of the target.
    3. Atomically restores the backup into the target using SQLite backup API.
    4. Verifies the restored target.
    5. If verification fails, rolls back to the pre-restore snapshot.
    """
    backup_path = Path(backup_file)
    if not backup_path.exists():
        raise FileNotFoundError(f"Backup file not found at {backup_path}")

    if not verify_database_integrity(backup_path):
        raise ValueError(f"Backup file {backup_path} is corrupted or failed integrity check")

    target = Path(target_db_path) if target_db_path else config.get_db_path()
    target.parent.mkdir(parents=True, exist_ok=True)
    safety_backup = None

    # Step 1: Create a safety backup of current target if it exists
    if target.exists() and target.stat().st_size > 0:
        safety_backup = target.parent / f".safety_pre_restore_{target.name}"
        try:
            shutil.copyfile(target, safety_backup)
        except Exception as exc:
            logger.warning("Could not create pre-restore safety backup: %s", exc)

    # Step 2: Restore from backup using online backup API to target
    try:
        src_conn = sqlite3.connect(str(backup_path))
        try:
            dst_conn = sqlite3.connect(str(target), timeout=30.0)
            try:
                src_conn.backup(dst_conn)
            finally:
                dst_conn.close()
        finally:
            src_conn.close()

        # Step 3: Verify restored target
        if not verify_database_integrity(target):
            raise RuntimeError("Restored database failed integrity check")

        # Success: remove safety backup
        if safety_backup and safety_backup.exists():
            safety_backup.unlink(missing_ok=True)

        logger.info("Successfully restored database from %s", backup_path)
        return True

    except Exception as exc:
        logger.error("Database restore failed: %s; rolling back", exc)
        # Roll back to safety backup if it existed
        if safety_backup and safety_backup.exists():
            shutil.copyfile(safety_backup, target)
            safety_backup.unlink(missing_ok=True)
        raise
