from faster_whisper import WhisperModel
import torch
from pyannote.audio import Pipeline
import subprocess
from tempfile import NamedTemporaryFile
from threading import Lock
from time import perf_counter

import os
from dotenv import load_dotenv


load_dotenv()
model_size = "small"
hf_token = os.getenv("HUGGING_FACE")

_whisper_model = None
_whisper_model_lock = Lock()
_whisper_inference_lock = Lock()

_diarization_pipeline = None
_diarization_pipeline_lock = Lock()
_diarization_inference_lock = Lock()


def _log_stage_duration(stage_name: str, started_at: float) -> None:
    elapsed = perf_counter() - started_at
    print(f"[timing] {stage_name}: {elapsed:.2f}s")


def _get_whisper_model() -> WhisperModel:
    global _whisper_model

    if _whisper_model is None:
        with _whisper_model_lock:
            if _whisper_model is None:
                print("loading whisper model...")
                _whisper_model = WhisperModel(
                    model_size,
                    device="cpu",
                    compute_type="int8",
                )
                print("whisper model loaded successfully")

    return _whisper_model


def _get_diarization_pipeline() -> Pipeline:
    global _diarization_pipeline

    if _diarization_pipeline is None:
        with _diarization_pipeline_lock:
            if _diarization_pipeline is None:
                print("loading diarization pipeline...")
                pipeline = Pipeline.from_pretrained(
                    "pyannote/speaker-diarization-3.1",
                    token=hf_token,
                )
                device = torch.device("cpu")
                pipeline.to(device)
                _diarization_pipeline = pipeline
                print(f"diarization pipeline loaded successfully on {device}")

    return _diarization_pipeline


def normalize_audio(audio_path: str) -> str:
    print(f"normalizing audio to 16kHz mono wav: {audio_path}")
    with NamedTemporaryFile(
        delete=False,
        prefix="ciceron_normalized_",
        suffix=".wav",
    ) as tmp:
        normalized_path = tmp.name

    command = [
        "ffmpeg",
        "-y",
        "-i",
        audio_path,
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "16000",
        "-ac",
        "1",
        normalized_path,
    ]
    result = subprocess.run(
        command,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )

    if result.returncode != 0:
        if os.path.exists(normalized_path):
            os.remove(normalized_path)
        error_tail = (result.stderr or "").strip().splitlines()[-5:]
        raise RuntimeError(
            "ffmpeg normalization failed: " + " | ".join(error_tail)
        )

    print(f"normalized audio created: {normalized_path}")
    return normalized_path


def transcribe(audio_path: str):
    print(f"starting transcription for: {audio_path}")
    model = _get_whisper_model()

    with _whisper_inference_lock:
        segments, _ = model.transcribe(
            audio_path,
            beam_size=1,
            condition_on_previous_text=True,
            temperature=0.0,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 800, "speech_pad_ms": 300},
            compression_ratio_threshold=3.5,
            log_prob_threshold=1.0,
            no_speech_threshold=0.7,
        )
        transcribed_segments = list(segments)

    print(f"transcription completed successfully")
    return transcribed_segments


def _build_single_speaker_transcript(whisper_results):
    return [
        {
            "speaker": "SPEAKER_00",
            "start": round(seg.start, 2),
            "end": round(seg.end, 2),
            "text": seg.text.strip(),
        }
        for seg in whisper_results
    ]


def _build_single_speaker_diarization(whisper_results):
    base_segments = [
        {
            "start": seg.start,
            "end": seg.end,
            "speaker": "SPEAKER_00",
        }
        for seg in whisper_results
    ]
    return merge_close_segments(base_segments, max_gap_seconds=0.3)


def run_diarization(audio_path: str, num_speakers: int):
    print(f"starting diarization for: {audio_path}")
    pipeline = _get_diarization_pipeline()

    with _diarization_inference_lock:
        diarization = pipeline(audio_path, num_speakers=num_speakers)

    print("diarization processing completed")
    segments = []
    for turn, _, speaker in diarization.speaker_diarization.itertracks(
        yield_label=True
    ):
        segments.append({
            "start": turn.start,
            "end": turn.end,
            "speaker": speaker,
        })
    print(f"diarization segments extracted: {len(segments)} segments found")
    return segments


def merge_close_segments(segments, max_gap_seconds=0.3):
    if not segments:
        return []

    merged = []
    current = segments[0].copy()
    for seg in segments[1:]:
        if seg["speaker"] == current["speaker"] and seg["start"] - current["end"] <= max_gap_seconds:
            current["end"] = max(current["end"], seg["end"])
            continue
        merged.append(current)
        current = seg.copy()
    merged.append(current)
    return merged


def split_audio(audio_path: str, num_speakers: int):
    print(f"processing audio file: {audio_path}")
    split_started_at = perf_counter()

    transcription_started_at = perf_counter()
    whisper_results = transcribe(audio_path)
    _log_stage_duration("transcription", transcription_started_at)
    print(f"whisper transcription returned {len(whisper_results)} segments")

    if num_speakers <= 1:
        print("skipping diarization because num_speakers <= 1")
        diarization_results = _build_single_speaker_diarization(whisper_results)
        transcript = _build_single_speaker_transcript(whisper_results)
        _log_stage_duration("split_audio_total", split_started_at)
        return {
            "audio_file": audio_path,
            "transcript": transcript,
            "diarization_raw": diarization_results,
        }

    diarization_started_at = perf_counter()
    diarization_results = run_diarization(audio_path, num_speakers)
    _log_stage_duration("diarization", diarization_started_at)

    merge_started_at = perf_counter()
    diarization_results = merge_close_segments(
        diarization_results, max_gap_seconds=0.3)
    _log_stage_duration("diarization_merge", merge_started_at)

    final_transcript = []
    print("matching transcription segments with speaker labels...")
    matching_started_at = perf_counter()

    for w_seg in whisper_results:
        w_start = w_seg.start
        w_end = w_seg.end

        speaker_id = "UNKNOWN"
        max_overlap = 0.0
        for d_seg in diarization_results:
            overlap_start = max(w_start, d_seg["start"])
            overlap_end = min(w_end, d_seg["end"])
            overlap = overlap_end - overlap_start
            if overlap > max_overlap:
                max_overlap = overlap
                speaker_id = d_seg["speaker"]

        if max_overlap <= 0.0 and diarization_results:
            nearest = None
            nearest_dist = float("inf")
            for d_seg in diarization_results:
                if w_end < d_seg["start"]:
                    dist = d_seg["start"] - w_end
                elif w_start > d_seg["end"]:
                    dist = w_start - d_seg["end"]
                else:
                    dist = 0.0

                if dist < nearest_dist:
                    nearest_dist = dist
                    nearest = d_seg

            max_nearest_gap_seconds = 0.5
            if nearest is not None and nearest_dist <= max_nearest_gap_seconds:
                speaker_id = nearest["speaker"]

        # Guardamos la información limpia
        final_transcript.append({
            "speaker": speaker_id,
            "start": round(w_seg.start, 2),
            "end": round(w_seg.end, 2),
            "text": w_seg.text.strip()
        })

    print(
        f"matching completed, {len(final_transcript)} final transcript segments created")
    _log_stage_duration("speaker_matching", matching_started_at)
    _log_stage_duration("split_audio_total", split_started_at)
    return {
        "audio_file": audio_path,
        "transcript": final_transcript,
        "diarization_raw": diarization_results
    }
