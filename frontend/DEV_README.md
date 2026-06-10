# Local Development

## Quick Start

For local debugging, you need to serve the files via HTTP (ES6 modules don't work with `file://` protocol).

### Option 1: Use the provided script
```bash
cd frontend
./serve-local.sh
```

Then open http://localhost:8080 in your browser.

### Option 2: Use Python directly
```bash
cd frontend
python3 -m http.server 8080
```

### Option 3: Use Node.js http-server
```bash
cd frontend
npx http-server -p 8080
```

## Adding URL Parameters

For local testing with different backends:
```
http://localhost:8080?backendUrl=http://localhost:5000&formbricksUrl=http://localhost:3000
```
