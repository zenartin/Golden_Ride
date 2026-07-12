# Use the official Python 3.11 image
FROM python:3.11-slim

# Set the working directory
WORKDIR /code

# Copy the requirements file into the container
COPY ./requirements.txt /code/requirements.txt

# Install the dependencies
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the rest of the application code
COPY ./app /code/app
COPY .env* /code/

# Hugging Face Spaces run on port 7860 by default
# We use a non-root user for security (required by Hugging Face)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Change working directory to user home
WORKDIR $HOME/app

# Copy the app files with correct permissions
COPY --chown=user . $HOME/app

# Start the FastAPI application on port 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
