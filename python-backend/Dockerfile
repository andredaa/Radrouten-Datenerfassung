FROM python:3.13

WORKDIR /opt/api-gis

# install curl
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# use official uv installation
ADD https://astral.sh/uv/install.sh /install.sh
RUN sh /install.sh && mv /root/.local/bin/uv /usr/local/bin/uv && mv /root/.local/bin/uvx /usr/local/bin/uvx

# set uv use system python
ENV UV_SYSTEM_PYTHON=1

COPY python-backend/main.py main.py
COPY python-backend/pyproject.toml python-backend/uv.lock* ./

# install dependencies
RUN uv pip install --no-cache -r pyproject.toml

COPY python-backend/ .

# TODO add some more workers
CMD ["uvicorn", "server:app", "--proxy-headers", "--host", "0.0.0.0", "--port", "5000"]