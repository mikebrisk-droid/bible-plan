/* Toasts: Ding (ding.js) draws one spring-physics toast that morphs in place.
   shell.js calls it through window.ding; its own toast() falls back to the plain pill until this loads. */
import { mountToaster, toast } from './ding.js';

// the toast takes the opposite of the site's theme so it stands out: light on a dark page, dark on a light one
function toastTheme() {
	return document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
}

// top right, just under the app bar (style.css); sound follows the menu's Sounds switch (shell.js)
mountToaster({ position: 'top-right', theme: toastTheme() });
toast.configure({ sound: !!(window.rtbSettings && window.rtbSettings.sound) });

// follow the site's light/dark toggle rather than the system setting
new MutationObserver(function () { toast.configure({ theme: toastTheme() }); })
	.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

window.ding = toast;
