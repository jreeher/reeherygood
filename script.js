// ===== SCROLL REVEAL =====
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-up').forEach(el => revealObserver.observe(el));


// ===== FEATURED SLIDER =====
const sliderTrack = document.getElementById('sliderTrack');
if (sliderTrack) {
  // Shuffle slides into random order on each page load
  const slideArray = Array.from(sliderTrack.querySelectorAll('.slider-slide'));
  for (let i = slideArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    sliderTrack.appendChild(slideArray[j]);
    [slideArray[i], slideArray[j]] = [slideArray[j], slideArray[i]];
  }

  const slides = sliderTrack.querySelectorAll('.slider-slide');
  const total = slides.length;
  let current = 0;
  let autoTimer;

  const dotsContainer = document.getElementById('sliderDots');
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  });

  function goTo(n) {
    current = (n + total) % total;
    sliderTrack.style.transform = `translateX(-${current * 100}%)`;
    dotsContainer.querySelectorAll('.slider-dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });
  }

  function resetAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => goTo(current + 1), 5000);
  }

  document.getElementById('sliderPrev').addEventListener('click', () => { goTo(current - 1); resetAuto(); });
  document.getElementById('sliderNext').addEventListener('click', () => { goTo(current + 1); resetAuto(); });

  resetAuto();
}


// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
}
