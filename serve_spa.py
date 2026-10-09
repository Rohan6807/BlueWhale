import http.server
import socketserver
import os

PORT = 5173
DIRECTORY = "frontend/dist"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # If the file doesn't exist, route to index.html (SPA fallback)
        path = self.translate_path(self.path)
        if not os.path.exists(path) or os.path.isdir(path):
            self.path = '/index.html'
        return super().do_GET()

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Frontend serving at http://localhost:{PORT}")
    httpd.serve_forever()
