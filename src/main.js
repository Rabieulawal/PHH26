import './style.css';

const galleryToggle = document.querySelector('.maker-gallery__toggle');
const galleryTrack = document.querySelector('#maker-gallery-track');

if (galleryToggle && galleryTrack) {
  const toggleIcon = galleryToggle.querySelector('span');

  galleryToggle.addEventListener('click', () => {
    const paused = galleryTrack.classList.toggle('is-paused');
    galleryToggle.setAttribute('aria-pressed', String(paused));

    if (toggleIcon) toggleIcon.textContent = paused ? '▶' : 'Ⅱ';
  });
}
