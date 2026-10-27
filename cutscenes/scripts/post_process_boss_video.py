import subprocess
import glob
import os
import wave
import numpy as np
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
frames_dir = '/tmp/boss_cinematic_frames'
output_mp4 = '/Users/ashishsingh/Desktop/kaliyuga/dundubhi_boss_entry_cinematic.mp4'
output_gif = '/Users/ashishsingh/Desktop/kaliyuga/dundubhi_boss_entry_cinematic.gif'

frames = sorted(glob.glob(os.path.join(frames_dir, '*.png')))
print(f'Processing {len(frames)} rendered frames...')

# 1. Overlay Title Card on frames 125 to 175
for idx, fpath in enumerate(frames):
    frame_num = idx + 1
    if 125 <= frame_num <= 175:
        # Calculate fade in/out alpha
        if frame_num < 135:
            alpha = (frame_num - 125) / 10.0
        elif frame_num > 165:
            alpha = (175 - frame_num) / 10.0
        else:
            alpha = 1.0
            
        img = Image.open(fpath).convert('RGBA')
        overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        
        # Golden boss title
        title = "D U N D U B H I"
        subtitle = "THE BRONZE-HORNED WARLORD · GUARDIAN OF THE CHARNEL GATE"
        
        w, h = img.size
        # Draw dark gradient band behind title for readability
        band_y1 = int(h * 0.72)
        band_y2 = int(h * 0.88)
        band_alpha = int(140 * alpha)
        draw.rectangle([0, band_y1, w, band_y2], fill=(8, 6, 8, band_alpha))
        
        # Draw decorative thin gold rule lines
        line_alpha = int(220 * alpha)
        draw.line([w * 0.25, band_y1 + 5, w * 0.75, band_y1 + 5], fill=(212, 165, 72, line_alpha), width=2)
        draw.line([w * 0.32, band_y2 - 5, w * 0.68, band_y2 - 5], fill=(212, 165, 72, line_alpha), width=1)
        
        # Load fonts or fallback
        try:
            font_title = ImageFont.truetype("/System/Library/Fonts/Supplemental/Cinzel-Bold.otf", 44)
            font_sub = ImageFont.truetype("/System/Library/Fonts/Supplemental/Avenir Next.ttc", 20)
        except Exception:
            try:
                font_title = ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", 44)
                font_sub = ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", 18)
            except Exception:
                font_title = font_sub = ImageFont.load_default()
                
        title_alpha = int(255 * alpha)
        sub_alpha = int(220 * alpha)
        
        # Draw centered title
        draw.text((w // 2, int(h * 0.76)), title, fill=(240, 205, 120, title_alpha), font=font_title, anchor="mm")
        draw.text((w // 2, int(h * 0.83)), subtitle, fill=(200, 190, 180, sub_alpha), font=font_sub, anchor="mm")
        
        # Composite back
        out = Image.alpha_composite(img, overlay).convert('RGB')
        out.save(fpath)

print('Embedded high-impact cinematic Boss Title Card on frames 125-175.')

# 2. Synthesize High-Impact 6-second Cinematic Stereo Soundtrack (30 FPS * 180 = 6.0s)
sample_rate = 48000
duration = 6.0
num_samples = int(sample_rate * duration)
t = np.linspace(0, duration, num_samples, endpoint=False)

# Track 1: Sub-bass Seismic Rumble (32Hz - 48Hz)
rumble = 0.40 * np.sin(2 * np.pi * 38 * t) * (1.0 + 0.35 * np.sin(2 * np.pi * 2.8 * t))

# Track 2: Hoof Stomp Impact (t = 0.6s / frame 18)
def impact(hit_time, freq=65.0, decay=5.0):
    dt = t - hit_time
    mask = (dt >= 0) & (dt < 1.2)
    env = np.exp(-dt * decay)
    body = np.sin(2 * np.pi * (freq * np.exp(-dt * 6.0)) * dt)
    return np.where(mask, body * env, 0.0)

stomp = 0.75 * impact(0.60, freq=55.0, decay=4.0)

# Track 3: The Primal Beast Roar (Shot 3: t = 3.9s to 5.6s / frames 116-168)
t_roar = t - 3.9
roar_mask = (t >= 3.9) & (t <= 5.8)
pitch_sweep = 92.0 - 28.0 * np.clip(t_roar / 1.8, 0, 1)
growl_lfo = np.sin(2 * np.pi * 22 * t)
roar_core = (
    np.sin(2 * np.pi * pitch_sweep * t) +
    0.6 * np.sin(2 * np.pi * (pitch_sweep * 1.95) * t) +
    0.35 * np.sin(2 * np.pi * (pitch_sweep * 3.1) * t) +
    0.2 * np.sin(2 * np.pi * (pitch_sweep * 4.4) * t)
)
roar_distorted = np.tanh(roar_core * (2.2 + growl_lfo * 1.2)) * 0.70
roar_env = np.sin(np.clip(t_roar / 1.9, 0, 1) * np.pi) ** 0.8
roar = np.where(roar_mask, roar_distorted * roar_env, 0.0)

# Track 4: Cinematic Orchestral Stinger & Brass Swell (t = 1.85s / frame 56 and t = 3.85s / frame 116)
brass_1 = 0.35 * impact(1.85, freq=110.0, decay=2.5)
brass_2 = 0.60 * impact(3.85, freq=85.0, decay=2.2)

# Track 5: Flame Braziers & Wind Ambient
flame_noise = np.random.uniform(-0.03, 0.03, num_samples)
flame = np.convolve(flame_noise, np.ones(35)/35, mode='same')

# Master Mix
master = rumble + stomp + roar + brass_1 + brass_2 + flame
master = np.tanh(master * 1.25)
master_int16 = (master * 32767 * 0.88).astype(np.int16)

# Stereo width
left = master_int16
right = (np.roll(master, 16) * 32767 * 0.88).astype(np.int16)
stereo = np.empty((num_samples * 2,), dtype=np.int16)
stereo[0::2] = left
stereo[1::2] = right

wav_path = '/tmp/boss_soundtrack.wav'
with wave.open(wav_path, 'wb') as wav:
    wav.setnchannels(2)
    wav.setsampwidth(2)
    wav.setframerate(sample_rate)
    wav.writeframes(stereo.tobytes())

print('Synthesized master cinematic stereo audio track.')

# 3. Compile Master 1080p MP4 with Letterbox and Audio
cmd_mp4 = [
    ffmpeg_exe,
    '-y',
    '-framerate', '30',
    '-i', os.path.join(frames_dir, 'frame_%04d.png'),
    '-i', wav_path,
    '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '16', # Ultra high quality
    '-c:a', 'aac',
    '-b:a', '256k',
    '-shortest',
    '-movflags', '+faststart',
    output_mp4
]

print('Encoding final master 1080p MP4...')
res = subprocess.run(cmd_mp4, capture_output=True, text=True)
if res.returncode == 0:
    print(f'Successfully exported master MP4: {output_mp4} ({os.path.getsize(output_mp4)/(1024*1024):.2f} MB)')
else:
    print('MP4 error:', res.stderr)

# 4. Compile high-quality GIF
cmd_gif = [
    ffmpeg_exe,
    '-y',
    '-i', output_mp4,
    '-vf', 'fps=15,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3',
    output_gif
]
subprocess.run(cmd_gif, capture_output=True)
print(f'Exported GIF preview: {output_gif} ({os.path.getsize(output_gif)/(1024*1024):.2f} MB)')
