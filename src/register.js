import './style.css';

const embed = document.getElementById('register-form-embed');
const status = document.getElementById('register-status');
const fallback = document.getElementById('register-fallback');

if (embed && status && fallback) {
  let timeoutId;

  const markReady = () => {
    if (embed.childElementCount === 0) return false;

    status.textContent = 'The pre-registration form is ready.';
    fallback.hidden = true;
    window.clearTimeout(timeoutId);
    observer.disconnect();
    return true;
  };

  const observer = new MutationObserver(markReady);
  observer.observe(embed, { childList: true, subtree: true });

  if (!markReady()) {
    timeoutId = window.setTimeout(() => {
      if (embed.childElementCount > 0) return;
      status.textContent = 'The pre-registration form is taking longer than expected.';
      fallback.hidden = false;
    }, 8000);
  }
}
