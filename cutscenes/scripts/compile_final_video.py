import subprocess
import glob
import os
import imageio_ffmpeg

ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
print('Using FFmpeg:', ffmpeg_exe)

frames_dir = '/tmp/cutscene_perfect_frames'
output_mp4 = '/Users/ashishsingh/Desktop/kaliyuga/kaliyuga_cutscene_final.mp4'
output_gif = '/Users/ashishsingh/Desktop/kaliyuga/kaliyuga_cutscene_final.gif'

frames = sorted(glob.glob(os.path.join(frames_dir, '*.png')))
print(f'Found {len(frames)} rendered frames.')

# 1. Compile 1080p Cinematic MP4 with Letterbox and Color Grading
cmd_mp4 = [
    ffmpeg_exe,
    '-y',
    '-framerate', '24',
    '-i', os.path.join(frames_dir, 'frame_%04d.png'),
    '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '17',
    '-movflags', '+faststart',
    output_mp4
]

print('Running FFmpeg MP4 encoding...')
res = subprocess.run(cmd_mp4, capture_output=True, text=True)
if res.returncode == 0:
    print(f'Successfully created MP4: {output_mp4} ({os.path.getsize(output_mp4) / (1024*1024):.2f} MB)')
else:
    print('MP4 encoding error:', res.stderr)

# 2. Compile high-quality GIF preview
cmd_gif = [
    ffmpeg_exe,
    '-y',
    '-i', output_mp4,
    '-vf', 'fps=16,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3',
    output_gif
]

print('Running FFmpeg GIF encoding...')
res_gif = subprocess.run(cmd_gif, capture_output=True, text=True)
if res_gif.returncode == 0:
    print(f'Successfully created GIF: {output_gif} ({os.path.getsize(output_gif) / (1024*1024):.2f} MB)')
