import uvicorn

if __name__ == "__main__":
    print("Starting Golden Ride User Backend API...")
    print("API Documentation: http://localhost:8001/docs")
    # Restrict reload to the application package to avoid scanning large folders (venv, site-packages)
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True, reload_dirs=["app"])
