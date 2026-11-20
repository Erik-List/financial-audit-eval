# The computer every harness attaches to: Chromium on a 1920x1080 screen.
# Base image: jlesage/chromium 26.10.1 (VNC on 5900, web view on 5800, browser protocol on 9222).
# Added here: ffmpeg, to record the screen from inside the environment.
FROM jlesage/chromium@sha256:71e2e8468eb00519a1f90cbb82a12651c2541c6f5e85030faf9c8dd2ec2cc831

RUN add-pkg ffmpeg

COPY record-start /usr/local/bin/record-start
COPY record-stop /usr/local/bin/record-stop
RUN chmod +x /usr/local/bin/record-start /usr/local/bin/record-stop
