# EXPERIMENTAL ONLY — handwriting PoC inference service. Not part of the main app's
# deploy pipeline; built/deployed manually to Cloud Run for this test only.
FROM python:3.11-slim

WORKDIR /app

# System deps for opencv-python-headless (still needs libgl/glib at runtime on slim images)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 git curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt --index-url https://download.pytorch.org/whl/cpu --extra-index-url https://pypi.org/simple

# Vendor DM-Font source at build time (same commit-pinned clone used locally).
RUN git clone --depth 1 https://github.com/clovaai/dmfont.git dmfont-src

# Bake the pretrained checkpoint into the image at build time (not committed to git).
# Fails the build loudly (non-zero exit) if the download fails — no silent partial image.
ARG CHECKPOINT_URL=https://github.com/clovaai/dmfont/releases/download/v1.0.0/korean-handwriting.pth
ARG CHECKPOINT_SHA256=
RUN mkdir -p checkpoints && \
    curl -fL -o checkpoints/korean-handwriting.pth "$CHECKPOINT_URL" && \
    ls -la checkpoints/korean-handwriting.pth && \
    if [ -n "$CHECKPOINT_SHA256" ]; then \
        echo "$CHECKPOINT_SHA256  checkpoints/korean-handwriting.pth" | sha256sum -c - ; \
    fi

COPY app.py .
COPY model/ model/
COPY preprocessing/ preprocessing/
COPY reference_chars.json .

# Cloud Run injects $PORT; default 8080 matches Cloud Run's convention (not the 7860 used by HF Spaces).
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
