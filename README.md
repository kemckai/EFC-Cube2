# EFC-Cube2 — the Nov 2026 redesign of the Eugene Fight Club cube site, live at http://45.82.72.19/efc-cube/

An interactive 3D cube showcasing all aspects of your band - music, photos, merch, gigs, bio, and videos!

## Features

Each face of the cube contains different content:

- **🎵 Front Face - Music Player**: Your songs with play controls
- **📸 Back Face - Photo Gallery**: Band and live performance photos
- **🛍️ Right Face - Merch Store**: T-shirts, vinyl, hoodies with shopping cart
- **🎸 Left Face - Upcoming Gigs**: Concert dates with ticket purchase options
- **👥 Top Face - Band Bio**: Member info and contact details
- **🎥 Bottom Face - Music Videos**: Embedded video content

## Setup Instructions

1. **Open the cube**: Simply open `index.html` in a web browser (Chrome, Firefox, Safari, etc.)

2. **Add your music files**:
   - Place your MP3 files in the `songs/` folder
   - Update the file paths in `index.html` (search for `songs/track1.mp3`, etc.)
   - Update song titles in the music panel section

3. **Add your photos**:
   - Place your band photos in the `images/` folder
   - Name them: `band1.jpg`, `band2.jpg`, `live1.jpg`, `live2.jpg`
   - Or update the image paths in the gallery panel section

4. **Customize content**:
   - **Band Info**: Edit the "Band Bio" panel with your real band name, members, and contact info
   - **Merch Items**: Update prices and product names in the merch panel
   - **Gig Dates**: Replace placeholder dates with your actual shows
   - **Videos**: Add your YouTube/Vimeo embed codes in the videos panel

## File Structure

```
Band_Cube/
├── index.html          # Main application file
├── songs/              # Put your MP3 files here
│   ├── track1.mp3
│   ├── track2.mp3
│   └── ...
├── images/             # Put your photos here
│   ├── band1.jpg
│   ├── band2.jpg
│   ├── live1.jpg
│   └── live2.jpg
└── README.md          # This file
```

## How to Use

1. **Move your mouse** to smoothly rotate the cube - no clicking or dragging needed!
2. **Scroll/pinch** to zoom in and out on the cube
3. **Auto-rotate mode** - cube slowly rotates by itself after 2 seconds of no mouse movement
4. **Auto-snap feature** - when a face is nearly centered, the cube automatically snaps and pauses
5. **Hover over a square** - the cube freezes and the square highlights for easy clicking
6. **Click** on individual grid items to interact with them
7. **Click photos** in the gallery to view them full-screen (press Escape to close)

### Smart Click System
- **Auto-rotate**: Cube spins by itself when idle (after 2 seconds of no mouse movement)
- **Auto-snap**: Cube pauses when a face is directly forward for easy viewing
- **Complete freeze on hover**: Cube stops completely when you hover over any clickable item
- Cursor changes to pointer when over clickable items
- Squares glow when you hover over them
- Any mouse movement stops auto-rotation and gives you full control

### Navigation Tips
- **Hands-free mode**: Stop moving your mouse and the cube will auto-rotate slowly after 2 seconds
- **Take control**: Move your mouse at any time to stop auto-rotation and control the cube manually
- **Move mouse LEFT/RIGHT** to rotate horizontally and see all 4 side faces (Music, Gallery, Merch, Gigs)
- **Move mouse UP/DOWN** to tilt and see top/bottom faces (Bio, Videos)
- **Photo Gallery is on the BACK** - move mouse to far LEFT or far RIGHT to rotate around
- When you find a face you like, move mouse near center - cube will snap to that face
- Once snapped, the cube stays still so you can read and click items
- Hover over any square to freeze the cube completely for easy clicking

### Face Locations:
- **Front**: Music Player (default view)
- **Back**: 📸 Photo Gallery (rotate mouse far left or right)
- **Right**: Band Merch (move mouse right)
- **Left**: Upcoming Gigs (move mouse left)
- **Top**: Band Bio (move mouse up)
- **Bottom**: Music Videos (move mouse down)

## Customization Guide

### Changing Face Colors

In `index.html`, find the `faceContents` object and modify the color values:

```javascript
this.faceContents = {
    front: { type: 'music', title: 'Music Player', color: 0xff6b6b },
    // Change the hex color codes to your preference
}
```

### Adding More Songs

Find the `musicPanel` section and add more song items:

```html
<div class="song-item" data-song="songs/your-song.mp3">
    <h3>Your Song Title</h3>
    <button onclick="playSong('songs/your-song.mp3', this)">Play</button>
</div>
```

### Embedding Real Music Videos

Replace the placeholder divs with YouTube embed codes:

```html
<iframe width="100%" height="315" 
    src="https://www.youtube.com/embed/YOUR_VIDEO_ID" 
    frameborder="0" allowfullscreen>
</iframe>
```

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support  
- Safari: ✅ Full support
- Mobile browsers: ✅ Touch-friendly

## Notes

- For the music player to work with local files, you may need to run a local server due to browser CORS restrictions
- To run a simple local server: `python -m http.server 8000` then visit `http://localhost:8000`
- The cube works best on modern browsers with WebGL support

## Tech Stack

- **Three.js**: 3D graphics and cube rendering
- **OrbitControls**: Interactive camera controls
- **Web Audio API**: Music playback functionality
- **Vanilla JavaScript**: No framework dependencies

## Future Enhancements

Consider adding:
- Actual audio file playback with Web Audio API
- Real shopping cart with payment integration
- Newsletter signup form
- Social media links
- Streaming platform links (Spotify, Apple Music)
- Tour map with locations

Enjoy your interactive band cube! 🎵✨

