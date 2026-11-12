"""
Voice profile export/import module.

Handles exporting profiles to ZIP archives and importing them back.
Also handles exporting individual generations.
"""

import json
import re
import zipfile
import io
from pathlib import Path
from typing import Optional
from sqlalchemy.orm import Session

MAX_UNCOMPRESSED_PROFILE_BYTES = 200 * 1024 * 1024  # 200 MB
MAX_UNCOMPRESSED_GENERATION_BYTES = 100 * 1024 * 1024  # 100 MB
MAX_ZIP_ENTRIES = 500
_SAFE_FILENAME_RE = re.compile(r"^[a-zA-Z0-9_.-]+$")


def _safe_read_zip_entry(
    zip_file: zipfile.ZipFile,
    name: str,
    max_bytes: int,
    cumulative_tracker: list[int] | None = None,
    overall_limit: int | None = None,
) -> bytes:
    """Safely stream and decompress a zip entry with strict byte limits.

    Guards against high-compression zip bombs and incorrect/misleading file_size
    metadata in the central directory or local headers.
    """
    chunks: list[bytes] = []
    total = 0
    with zip_file.open(name, "r") as stream:
        while True:
            chunk = stream.read(64 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > max_bytes:
                raise ValueError(
                    f"ZIP entry {name!r} decompressed size exceeds allowed limit ({max_bytes} bytes)"
                )
            if cumulative_tracker is not None and overall_limit is not None:
                cumulative_tracker[0] += len(chunk)
                if cumulative_tracker[0] > overall_limit:
                    raise ValueError(
                        f"Cumulative decompressed size exceeds archive limit ({overall_limit} bytes)"
                    )
            chunks.append(chunk)
    return b"".join(chunks)


def _audit_zip_safety(zip_file: zipfile.ZipFile, max_uncompressed_bytes: int) -> None:
    """Validate archive against Zip Slip, symlinks, reparse points, and zip bombs."""
    infos = zip_file.infolist()
    if len(infos) > MAX_ZIP_ENTRIES:
        raise ValueError(f"ZIP archive contains too many files ({len(infos)} > {MAX_ZIP_ENTRIES})")

    total_uncompressed = 0
    for info in infos:
        name = info.filename
        if (
            ".." in name
            or name.startswith("/")
            or name.startswith("\\")
            or ":" in name
            or "\x00" in name
        ):
            raise ValueError(f"Malicious path traversal detected in ZIP entry: {name}")

        # Reject POSIX symlinks (S_IFLNK = 0o120000)
        if (info.external_attr >> 16) & 0o170000 == 0o120000:
            raise ValueError(f"Symlinks are forbidden in ZIP archive: {name}")

        # Reject Windows directory reparse points / junctions
        if info.external_attr & 0x400 != 0:
            raise ValueError(f"Reparse points / symlinks are forbidden in ZIP archive: {name}")

        total_uncompressed += info.file_size
        if total_uncompressed > max_uncompressed_bytes:
            raise ValueError(
                f"ZIP uncompressed content exceeds size limit ({max_uncompressed_bytes // (1024 * 1024)} MB)"
            )

from ..models import VoiceProfileResponse
from ..database import VoiceProfile as DBVoiceProfile, ProfileSample as DBProfileSample, Generation as DBGeneration, GenerationVersion as DBGenerationVersion
from .profiles import create_profile, add_profile_sample
from ..models import VoiceProfileCreate
from .. import config


def _get_unique_profile_name(name: str, db: Session) -> str:
    """
    Get a unique profile name by appending a number if needed.
    
    Args:
        name: Original profile name
        db: Database session
        
    Returns:
        Unique profile name
    """
    base_name = name
    counter = 1
    
    while True:
        existing = db.query(DBVoiceProfile).filter_by(name=name).first()
        if not existing:
            return name
        
        name = f"{base_name} ({counter})"
        counter += 1


def export_profile_to_zip(profile_id: str, db: Session) -> bytes:
    """
    Export a voice profile to a ZIP archive.
    
    Args:
        profile_id: Profile ID to export
        db: Database session
        
    Returns:
        ZIP file contents as bytes
        
    Raises:
        ValueError: If profile not found or has no samples
    """
    # Get profile
    profile = db.query(DBVoiceProfile).filter_by(id=profile_id).first()
    if not profile:
        raise ValueError(f"Profile {profile_id} not found")
    
    # Get all samples
    samples = db.query(DBProfileSample).filter_by(profile_id=profile_id).all()
    if not samples:
        raise ValueError(f"Profile {profile_id} has no samples")
    
    # Create ZIP in memory
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        # Check if profile has avatar
        has_avatar = False
        if profile.avatar_path:
            avatar_path = config.resolve_storage_path(profile.avatar_path)
            if avatar_path is not None and avatar_path.exists():
                has_avatar = True
                # Add avatar to ZIP root with original extension
                avatar_ext = avatar_path.suffix
                zip_file.write(avatar_path, f"avatar{avatar_ext}")

        # Create manifest.json
        manifest = {
            "version": "1.0",
            "profile": {
                "name": profile.name,
                "description": profile.description,
                "language": profile.language,
            },
            "has_avatar": has_avatar,
        }
        zip_file.writestr("manifest.json", json.dumps(manifest, indent=2))

        # Create samples.json mapping
        samples_data = {}
        profile_dir = config.get_profiles_dir() / profile_id

        for sample in samples:
            # Get filename from audio_path (should be {sample_id}.wav)
            audio_path = config.resolve_storage_path(sample.audio_path)
            if audio_path is None:
                raise ValueError(f"Audio file not found: {sample.audio_path}")
            filename = audio_path.name

            # Read audio file
            if not audio_path.exists():
                raise ValueError(f"Audio file not found: {audio_path}")

            # Add to samples directory in ZIP
            zip_path = f"samples/{filename}"
            zip_file.write(audio_path, zip_path)

            # Map filename to reference text
            samples_data[filename] = sample.reference_text

        zip_file.writestr("samples.json", json.dumps(samples_data, indent=2))
    
    zip_buffer.seek(0)
    return zip_buffer.read()


def _cleanup_failed_profile(profile_id: str | None, profile_dir, db: Session) -> None:
    """Clean up filesystem directory and database row on failed profile import."""
    import shutil
    if profile_dir is not None and Path(profile_dir).exists():
        shutil.rmtree(profile_dir, ignore_errors=True)
    if profile_id is not None:
        try:
            row = db.query(DBVoiceProfile).filter(DBVoiceProfile.id == profile_id).first()
            if row:
                db.delete(row)
                db.commit()
        except Exception:
            db.rollback()


async def import_profile_from_zip(file_bytes: bytes, db: Session) -> VoiceProfileResponse:
    """
    Import a voice profile from a ZIP archive.
    
    Args:
        file_bytes: ZIP file contents
        db: Database session
        
    Returns:
        Created profile
        
    Raises:
        ValueError: If ZIP is invalid or missing required files
    """
    zip_buffer = io.BytesIO(file_bytes)
    profile = None
    profile_dir = None
    
    try:
        with zipfile.ZipFile(zip_buffer, 'r') as zip_file:
            _audit_zip_safety(zip_file, MAX_UNCOMPRESSED_PROFILE_BYTES)
            # Validate ZIP structure
            namelist = zip_file.namelist()
            
            if "manifest.json" not in namelist:
                raise ValueError("ZIP archive missing manifest.json")
            
            if "samples.json" not in namelist:
                raise ValueError("ZIP archive missing samples.json")
            
            cumulative_tracker = [0]
            # Read manifest with streaming byte limits
            manifest_raw = _safe_read_zip_entry(
                zip_file, "manifest.json", 1024 * 1024, cumulative_tracker, MAX_UNCOMPRESSED_PROFILE_BYTES
            )
            manifest_data = json.loads(manifest_raw.decode("utf-8"))
            
            if "version" not in manifest_data:
                raise ValueError("Invalid manifest.json: missing version")
            
            if "profile" not in manifest_data:
                raise ValueError("Invalid manifest.json: missing profile")
            
            profile_data = manifest_data["profile"]
            
            # Read samples mapping with streaming byte limits
            samples_raw = _safe_read_zip_entry(
                zip_file, "samples.json", 1024 * 1024, cumulative_tracker, MAX_UNCOMPRESSED_PROFILE_BYTES
            )
            samples_data = json.loads(samples_raw.decode("utf-8"))
            
            if not isinstance(samples_data, dict):
                raise ValueError("Invalid samples.json: must be a dictionary")
            
            # Get unique profile name
            original_name = profile_data.get("name", "Imported Profile")
            unique_name = _get_unique_profile_name(original_name, db)
            
            # Create profile
            profile_create = VoiceProfileCreate(
                name=unique_name,
                description=profile_data.get("description"),
                language=profile_data.get("language", "en"),
            )
            
            profile = await create_profile(profile_create, db)

            # Extract and add samples
            profile_dir = config.get_profiles_dir() / profile.id
            profile_dir.mkdir(parents=True, exist_ok=True)

            # Handle avatar if present
            avatar_files = [
                f for f in namelist
                if f.startswith("avatar.")
                and Path(f).name == f
                and Path(f).suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
            ]
            if avatar_files:
                try:
                    avatar_file = avatar_files[0]
                    # Extract to temporary file
                    import tempfile
                    avatar_bytes = _safe_read_zip_entry(
                        zip_file, avatar_file, 10 * 1024 * 1024, cumulative_tracker, MAX_UNCOMPRESSED_PROFILE_BYTES
                    )
                    with tempfile.NamedTemporaryFile(suffix=Path(avatar_file).suffix, delete=False) as tmp:
                        tmp.write(avatar_bytes)
                        tmp_path = tmp.name

                    try:
                        from .profiles import upload_avatar
                        await upload_avatar(profile.id, tmp_path, db)
                    finally:
                        Path(tmp_path).unlink(missing_ok=True)
                except Exception as e:
                    # Avatar import is optional - continue even if it fails
                    pass

            for filename, reference_text in samples_data.items():
                # Validate filename
                if (
                    not isinstance(filename, str)
                    or not filename.endswith('.wav')
                    or not _SAFE_FILENAME_RE.match(filename)
                    or ".." in filename
                    or "/" in filename
                    or "\\" in filename
                ):
                    raise ValueError(f"Invalid sample filename: {filename} (must be a clean .wav filename)")
                
                # Extract audio file to temp location
                zip_path = f"samples/{filename}"
                
                if zip_path not in namelist:
                    raise ValueError(f"Sample file not found in ZIP: {zip_path}")
                
                # Extract to temporary file with streaming size limit
                sample_bytes = _safe_read_zip_entry(
                    zip_file, zip_path, 50 * 1024 * 1024, cumulative_tracker, MAX_UNCOMPRESSED_PROFILE_BYTES
                )
                import tempfile
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                    tmp.write(sample_bytes)
                    tmp_path = tmp.name
                
                try:
                    # Add sample to profile
                    await add_profile_sample(
                        profile.id,
                        tmp_path,
                        reference_text,
                        db,
                    )
                finally:
                    # Clean up temp file
                    Path(tmp_path).unlink(missing_ok=True)
            
            return profile
            
    except zipfile.BadZipFile:
        _cleanup_failed_profile(profile.id if profile else None, profile_dir, db)
        raise ValueError("Invalid ZIP file")
    except json.JSONDecodeError as e:
        _cleanup_failed_profile(profile.id if profile else None, profile_dir, db)
        raise ValueError(f"Invalid JSON in archive: {e}")
    except Exception as e:
        _cleanup_failed_profile(profile.id if profile else None, profile_dir, db)
        if isinstance(e, ValueError):
            raise
        raise ValueError(f"Error importing profile: {str(e)}")


def export_generation_to_zip(generation_id: str, db: Session) -> bytes:
    """
    Export a generation to a ZIP archive.
    
    Args:
        generation_id: Generation ID to export
        db: Database session
        
    Returns:
        ZIP file contents as bytes
        
    Raises:
        ValueError: If generation not found
    """
    # Get generation
    generation = db.query(DBGeneration).filter_by(id=generation_id).first()
    if not generation:
        raise ValueError(f"Generation {generation_id} not found")
    
    # Get profile info
    profile = db.query(DBVoiceProfile).filter_by(id=generation.profile_id).first()
    if not profile:
        raise ValueError(f"Profile {generation.profile_id} not found")
    
    # Get all versions for this generation
    versions = (
        db.query(DBGenerationVersion)
        .filter_by(generation_id=generation_id)
        .order_by(DBGenerationVersion.created_at)
        .all()
    )

    # Create ZIP in memory
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        # Build version manifest entries
        version_entries = []
        for v in versions:
            v_path = config.resolve_storage_path(v.audio_path)
            effects_chain = None
            if v.effects_chain:
                effects_chain = json.loads(v.effects_chain)
            version_entries.append({
                "id": v.id,
                "label": v.label,
                "is_default": v.is_default,
                "effects_chain": effects_chain,
                "filename": v_path.name,
            })

        manifest = {
            "version": "1.0",
            "generation": {
                "id": generation.id,
                "text": generation.text,
                "language": generation.language,
                "duration": generation.duration,
                "seed": generation.seed,
                "instruct": generation.instruct,
                "created_at": generation.created_at.isoformat(),
            },
            "profile": {
                "id": profile.id,
                "name": profile.name,
                "description": profile.description,
                "language": profile.language,
            },
            "versions": version_entries,
        }
        zip_file.writestr("manifest.json", json.dumps(manifest, indent=2))
        
        # Add all version audio files
        for v in versions:
            v_path = config.resolve_storage_path(v.audio_path)
            if v_path is not None and v_path.exists():
                zip_file.write(v_path, f"audio/{v_path.name}")

        # Fallback: if no versions exist, include the generation's main audio
        if not versions:
            audio_path = config.resolve_storage_path(generation.audio_path)
            if audio_path is not None and audio_path.exists():
                zip_file.write(audio_path, f"audio/{audio_path.name}")
    
    zip_buffer.seek(0)
    return zip_buffer.read()


async def import_generation_from_zip(file_bytes: bytes, db: Session) -> dict:
    """
    Import a generation from a ZIP archive.
    
    Args:
        file_bytes: ZIP file contents
        db: Database session
        
    Returns:
        Dictionary with generation ID and profile info
        
    Raises:
        ValueError: If ZIP is invalid or missing required files
    """
    from pathlib import Path
    import tempfile
    import shutil
    from datetime import datetime
    from .. import config
    
    zip_buffer = io.BytesIO(file_bytes)
    
    try:
        with zipfile.ZipFile(zip_buffer, 'r') as zip_file:
            _audit_zip_safety(zip_file, MAX_UNCOMPRESSED_GENERATION_BYTES)
            # Validate ZIP structure
            namelist = zip_file.namelist()
            
            if "manifest.json" not in namelist:
                raise ValueError("ZIP archive missing manifest.json")
            
            # Read manifest with streaming byte limit
            manifest_raw = _safe_read_zip_entry(zip_file, "manifest.json", 1024 * 1024)
            manifest_data = json.loads(manifest_raw.decode("utf-8"))
            
            if "version" not in manifest_data:
                raise ValueError("Invalid manifest.json: missing version")
            
            if "generation" not in manifest_data:
                raise ValueError("Invalid manifest.json: missing generation data")
            
            generation_data = manifest_data["generation"]
            profile_data = manifest_data.get("profile", {})
            
            # Validate required fields
            required_fields = ["text", "language", "duration"]
            for field in required_fields:
                if field not in generation_data:
                    raise ValueError(f"Invalid manifest.json: missing generation.{field}")
            
            # Find audio file in archive
            audio_files = [f for f in namelist if f.startswith("audio/") and f.endswith(".wav")]
            if not audio_files:
                raise ValueError("No audio file found in ZIP archive")
            
            audio_file_path = audio_files[0]
            
            # Check if we should match an existing profile or create metadata
            profile_id = None
            profile_name = profile_data.get("name", "Unknown Profile")
            
            # Try to find matching profile by name
            if profile_name and profile_name != "Unknown Profile":
                existing_profile = db.query(DBVoiceProfile).filter_by(name=profile_name).first()
                if existing_profile:
                    profile_id = existing_profile.id
            
            # If no matching profile, use a placeholder or the first available profile
            if not profile_id:
                # Get any profile, or None if no profiles exist
                any_profile = db.query(DBVoiceProfile).first()
                if any_profile:
                    profile_id = any_profile.id
                    profile_name = any_profile.name
                else:
                    raise ValueError("No voice profiles found. Please create a profile before importing generations.")
            
            # Extract audio file to temporary location with streaming byte limit
            audio_bytes = _safe_read_zip_entry(
                zip_file, audio_file_path, MAX_UNCOMPRESSED_GENERATION_BYTES
            )
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name
            
            try:
                # Create generations directory
                generations_dir = config.get_generations_dir()
                generations_dir.mkdir(parents=True, exist_ok=True)
                
                # Generate new ID for this generation
                new_generation_id = str(__import__('uuid').uuid4())
                
                # Copy audio to generations directory
                audio_dest = generations_dir / f"{new_generation_id}.wav"
                shutil.copy(tmp_path, audio_dest)
                
                # Create generation record
                db_generation = DBGeneration(
                    id=new_generation_id,
                    profile_id=profile_id,
                    text=generation_data["text"],
                    language=generation_data["language"],
                    audio_path=config.to_storage_path(audio_dest),
                    duration=generation_data["duration"],
                    seed=generation_data.get("seed"),
                    instruct=generation_data.get("instruct"),
                    created_at=datetime.utcnow(),
                )
                
                db.add(db_generation)
                db.commit()
                db.refresh(db_generation)
                
                return {
                    "id": db_generation.id,
                    "profile_id": profile_id,
                    "profile_name": profile_name,
                    "text": db_generation.text,
                    "message": f"Generation imported successfully (assigned to profile: {profile_name})"
                }
                
            finally:
                # Clean up temp file
                Path(tmp_path).unlink(missing_ok=True)
            
    except zipfile.BadZipFile:
        raise ValueError("Invalid ZIP file")
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in archive: {e}")
    except Exception as e:
        if isinstance(e, ValueError):
            raise
        raise ValueError(f"Error importing generation: {str(e)}")
