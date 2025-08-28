/*
 * JavaScript for Annual Progress Bar
 * This script handles the functionality of the annual progress bar, including
 * calculating the year's progress, updating the UI, handling user interactions,
 * and managing language and theme settings.
 */

// --- Configuration ---
const DEFAULT_COLOR = "#3b82f6"; // Default blue-500
const PERCENTAGE_PRECISION = 6; // Number of decimal places for live percentage
const STATIC_UPDATE_INTERVAL = 1000; // Milliseconds for low-frequency updates (days, etc.)
const CLIPBOARD_BLOCKS_TOTAL = 15; // Total blocks for clipboard format
const CLIPBOARD_BLOCK_FILLED = "▓";
const CLIPBOARD_BLOCK_EMPTY = "░";

// --- Translations ---
const translations = {
  "zh-CN": {
    pageTitle: "年度进度条",
    title: "今年已过去",
    daysPassedTemplate: "已过 {days} 天",
    daysRemainingTemplate: "剩余 {days} 天",
    totalDaysPrefix: "总计",
    totalDaysSuffix: "天",
    colorLabel: "进度条颜色",
    resetColorTooltip: "恢复默认颜色",
    themeLabel: "外观",
    languageLabel: "语言",
    copyLabel: "复制",
    copyTooltip: "复制进度文本",
    copiedTooltip: "已复制！",
    copyFailed: "复制失败",
    exportLabel: "保存",
    exportError: "抱歉，导出图片时遇到问题。请检查控制台获取更多信息。",
    exportFilenamePrefix: "年度进度",
  },
  en: {
    pageTitle: "Year Progress Bar",
    title: "Year Progress",
    daysPassedTemplate: "{days} days passed",
    daysRemainingTemplate: "{days} days remaining",
    totalDaysPrefix: "Total",
    totalDaysSuffix: "days",
    colorLabel: "Progress Color",
    resetColorTooltip: "Reset to default color",
    themeLabel: "Theme",
    languageLabel: "Language",
    copyLabel: "Copy",
    copyTooltip: "Copy progress text",
    copiedTooltip: "Copied!",
    copyFailed: "Copy failed",
    exportLabel: "Export",
    exportError:
      "Sorry, there was an error exporting the image. Please check the console for details.",
    exportFilenamePrefix: "Year_Progress",
  },
};

// --- DOM Elements ---
const progressBarFill = document.getElementById("progress-bar-fill");
const percentageText = document.getElementById("percentage");
const daysPassedText = document.getElementById("days-passed");
const daysRemainingText = document.getElementById("days-remaining");
const totalDaysText = document.getElementById("total-days");
const colorPicker = document.getElementById("color-picker");
const resetColorButton = document.getElementById("reset-color-button");
const themeToggle = document.getElementById("theme-toggle");
const themeIconLight = document.getElementById("theme-icon-light");
const themeIconDark = document.getElementById("theme-icon-dark");
const languageToggle = document.getElementById("language-toggle");
const copyButton = document.getElementById("copy-button");
const exportButton = document.getElementById("export-button");
const exportArea = document.getElementById("export-area");
const htmlElement = document.documentElement;

let currentLang = "zh-CN";
let animationFrameId = null;
let staticTimerId = null;

// --- Date Calculation (High Precision) ---
function getYearProgressPrecise() {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);

  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const totalDaysInYear = isLeap ? 366 : 365;
  const totalMsInYear = totalDaysInYear * 24 * 60 * 60 * 1000;

  const msPassed = now - startOfYear;
  const percentage = Math.min(100, (msPassed / totalMsInYear) * 100);

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysPassed = Math.floor(msPassed / msPerDay);

  const endOfYear = new Date(year + 1, 0, 1);
  const msRemaining = endOfYear - now;
  const daysRemaining = Math.floor(msRemaining / msPerDay);

  return {
    percentage: percentage,
    displayPercentage: percentage.toFixed(PERCENTAGE_PRECISION),
    daysPassed: daysPassed,
    daysRemaining: daysRemaining,
    totalDaysInYear: totalDaysInYear,
  };
}

// --- Language Handling ---
function setLanguage(lang) {
  if (!translations[lang]) {
    console.warn(`Language ${lang} not found, defaulting to zh-CN.`);
    lang = "zh-CN";
  }
  currentLang = lang;
  htmlElement.lang = lang;
  document.title = translations[lang].pageTitle;

  document.querySelectorAll("[data-lang-key]").forEach((el) => {
    const key = el.getAttribute("data-lang-key");
    const translation = translations[lang][key];
    if (translation !== undefined) {
      if (key.endsWith("Tooltip")) {
        el.title = translation;
      } else if (key.endsWith("Template")) {
        el.dataset.template = translation;
      } else {
        el.textContent = translation;
      }
    }
  });

  copyButton.title = translations[currentLang].copyTooltip;
  updateStaticElements(); // Update text with new language
  localStorage.setItem("language", lang);
}

// --- High-Frequency UI Updates (for smooth animations) ---
function updateLiveElements(progress) {
  progressBarFill.style.width = `${progress.percentage}%`;
  percentageText.textContent = `${progress.displayPercentage}%`;

  const progressTrack = document.querySelector('.progress-track');
  if (progressTrack) {
    progressTrack.setAttribute('aria-valuenow', Math.round(progress.percentage));
    progressTrack.setAttribute('aria-valuetext', `${progress.percentage.toFixed(1)}%`);
  }
}

// --- Low-Frequency UI Updates (for static data) ---
function updateStaticElements() {
  const progress = getYearProgressPrecise();
  const lang = currentLang;

  const daysPassedTextContent = (daysPassedText.dataset.template || translations[lang].daysPassedTemplate).replace("{days}", progress.daysPassed);
  daysPassedText.textContent = daysPassedTextContent;
  daysPassedText.setAttribute('aria-label', daysPassedTextContent);

  const daysRemainingTextContent = (daysRemainingText.dataset.template || translations[lang].daysRemainingTemplate).replace("{days}", progress.daysRemaining);
  daysRemainingText.textContent = daysRemainingTextContent;
  daysRemainingText.setAttribute('aria-label', daysRemainingTextContent);

  totalDaysText.textContent = `${progress.totalDaysInYear}`;
  totalDaysText.setAttribute('aria-label', `总计${progress.totalDaysInYear}天`);
}

// --- Main Animation Loop ---
function animationLoop() {
  const progress = getYearProgressPrecise();
  updateLiveElements(progress);

  animationFrameId = requestAnimationFrame(animationLoop);
}

// --- Theme Handling ---
const themes = { light: { class: '', icon: 'light' }, dark: { class: 'dark', icon: 'dark' } };
function applyTheme(theme) {
  Object.values(themes).forEach(t => t.class && htmlElement.classList.remove(t.class));
  const config = themes[theme];
  if (config && config.class) htmlElement.classList.add(config.class);
  themeIconLight.classList.toggle('hidden', config.icon !== 'light');
  themeIconDark.classList.toggle('hidden', config.icon !== 'dark');
}

function toggleTheme() {
  const newTheme = htmlElement.classList.contains('dark') ? 'light' : 'dark';
  applyTheme(newTheme);
  return newTheme;
}

// --- Toast Notification System ---
function showToast(message, type = 'success') {
  const existingToast = document.getElementById('toast-notification');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.id = 'toast-notification';
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'alert');

  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  const iconPaths = {
    success: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>',
    error: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>'
  };
  icon.innerHTML = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${iconPaths[type]}</svg>`;
  toast.insertBefore(icon, toast.firstChild);
  
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('toast-show'), 10);
  setTimeout(() => hideToast(toast), 3000);
}

function hideToast(toast) {
  if (!toast) return;
  toast.classList.remove('toast-show');
  setTimeout(() => toast.parentNode && toast.parentNode.removeChild(toast), 300);
}

// --- Clipboard Handling ---
function copyToClipboard() {
  const progress = getYearProgressPrecise();
  const numFilled = Math.round(progress.percentage / (100 / CLIPBOARD_BLOCKS_TOTAL));
  const numEmpty = CLIPBOARD_BLOCKS_TOTAL - numFilled;
  const clipboardText = `${CLIPBOARD_BLOCK_FILLED.repeat(numFilled)}${CLIPBOARD_BLOCK_EMPTY.repeat(numEmpty)} ${progress.percentage.toFixed(0)}%`;

  navigator.clipboard.writeText(clipboardText).then(() => {
    showToast(translations[currentLang].copiedTooltip, 'success');
    copyButton.title = translations[currentLang].copiedTooltip;
    setTimeout(() => {
      copyButton.title = translations[currentLang].copyTooltip;
    }, 1500);
  }).catch(err => {
    console.error("Failed to copy text: ", err);
    showToast(translations[currentLang].copyFailed, 'error');
  });
}

// --- Start/Stop Updates based on Visibility ---
function handleVisibilityChange() {
  if (document.hidden) {
    cancelAnimationFrame(animationFrameId);
    clearInterval(staticTimerId);
  } else {
    animationFrameId = requestAnimationFrame(animationLoop);
    updateStaticElements();
    staticTimerId = setInterval(updateStaticElements, STATIC_UPDATE_INTERVAL);
  }
}

// --- Initial Load & Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  // 1. Load Language
  const savedLang = localStorage.getItem("language");
  const browserLang = navigator.language || navigator.userLanguage;
  let initialLang = "zh-CN";
  if (savedLang && translations[savedLang]) initialLang = savedLang;
  else if (browserLang.startsWith("en")) initialLang = "en";
  setLanguage(initialLang);

  // 2. Load Theme
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(savedTheme || (prefersDark ? "dark" : "light"));

  // 3. Set initial progress bar color
  const savedColor = localStorage.getItem("progressBarColor") || DEFAULT_COLOR;
  progressBarFill.style.backgroundColor = savedColor;
  colorPicker.value = savedColor;
  
  // 4. Setup Event Listeners
  colorPicker.addEventListener("input", (event) => {
    const newColor = event.target.value;
    progressBarFill.style.backgroundColor = newColor;
    localStorage.setItem("progressBarColor", newColor);
  });
  
  resetColorButton.addEventListener("click", () => {
    progressBarFill.style.backgroundColor = DEFAULT_COLOR;
    colorPicker.value = DEFAULT_COLOR;
    localStorage.setItem("progressBarColor", DEFAULT_COLOR);
  });
  
  themeToggle.addEventListener("click", () => {
    const newTheme = toggleTheme();
    localStorage.setItem("theme", newTheme);
  });
  
  languageToggle.addEventListener("click", () => {
    const newLang = currentLang === "zh-CN" ? "en" : "zh-CN";
    setLanguage(newLang);
  });
  
  copyButton.addEventListener("click", copyToClipboard);

  exportButton.addEventListener("click", async () => {
    // Stop updates during export to prevent partial renders
    cancelAnimationFrame(animationFrameId);
    clearInterval(staticTimerId);

    // Show loading state with clear visual feedback
    const originalText = exportButton.innerHTML;
    exportButton.innerHTML = `
      <svg style="stroke: var(--button-text-color); animation: spin 1s linear infinite;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m-15.357-2a8.001 8.001 0 0015.357 2m0 0H15"></path>
      </svg>
    `;
    exportButton.disabled = true;
    exportButton.setAttribute('aria-label', '导出中，请稍候...');

    try {
      if (typeof html2canvas === 'undefined') throw new Error('html2canvas library not loaded');
      if (!exportArea) throw new Error('Export area not found');

      const computedStyle = window.getComputedStyle(exportArea);
      let finalBgColor = computedStyle.backgroundColor;
      if (!finalBgColor || finalBgColor === "rgba(0, 0, 0, 0)") {
        finalBgColor = window.getComputedStyle(document.body).backgroundColor;
      }

      const optimalScale = Math.max(window.devicePixelRatio || 1, 4);

      const canvas = await html2canvas(exportArea, {
        useCORS: true,
        backgroundColor: finalBgColor,
        scale: optimalScale,
        logging: false,
        onclone: (clonedDoc) => {
          const clonedExportArea = clonedDoc.getElementById("export-area");
          if (clonedExportArea) {
        // Force high-quality rendering
        Object.assign(clonedExportArea.style, {
          transform: 'scale(1.00001) translateZ(0)',
          transformOrigin: 'top left',
          '-webkit-font-smoothing': 'antialiased',
          'font-kerning': 'normal',
        });

        clonedExportArea.style.backgroundColor = finalBgColor;

        // Fix alignment for "总计 365 天"
        const totalDaysPrefix = clonedExportArea.querySelector('[data-lang-key="totalDaysPrefix"]');
        const totalDays = clonedExportArea.querySelector('#total-days');
        const totalDaysSuffix = clonedExportArea.querySelector('[data-lang-key="totalDaysSuffix"]');

        if (totalDaysPrefix && totalDays && totalDaysSuffix) {
          // Wrap them in a flex container for alignment
          const wrapper = clonedDoc.createElement('span');
          wrapper.style.display = 'inline-flex';
          wrapper.style.alignItems = 'center';
          wrapper.style.justifyContent = 'center';
          wrapper.style.gap = '4px';
          // Ensure wrapper sits correctly with surrounding text
          wrapper.style.verticalAlign = 'middle';
          wrapper.style.lineHeight = '1';

          totalDaysPrefix.parentNode.insertBefore(wrapper, totalDaysPrefix);
          wrapper.appendChild(totalDaysPrefix);
          wrapper.appendChild(totalDays);
          wrapper.appendChild(totalDaysSuffix);

          // Apply consistent text styles and align children to center baseline
          [totalDaysPrefix, totalDays, totalDaysSuffix].forEach((el) => {
            // Find the corresponding original element in the live document to copy styles
            const key = el.dataset.langKey;
            const originalElement =
              document.getElementById(el.id) ||
              (key ? document.querySelector(`[data-lang-key="${key}"]`) : null);

            const originalStyle = originalElement
              ? window.getComputedStyle(originalElement)
              : { fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'normal', color: 'inherit', lineHeight: 'normal' };

            // Make each child an inline-block and vertically centered
            Object.assign(el.style, {
              display: 'inline-block',
              verticalAlign: 'middle',
              alignSelf: 'center',
              fontFamily: originalStyle.fontFamily,
              fontSize: originalStyle.fontSize,
              fontWeight: originalStyle.fontWeight,
              lineHeight: originalStyle.lineHeight === 'normal' ? '1' : originalStyle.lineHeight,
              color: originalStyle.color,
              textAlign: 'center',
              margin: '0',
              padding: '0',
            });
          });
        }

        // Other text elements
        clonedExportArea.querySelectorAll('#percentage, #days-passed, #days-remaining, [data-lang-key="title"]')
          .forEach((textEl) => {
            const originalElement = document.getElementById(textEl.id) || document.querySelector(`[data-lang-key="${textEl.dataset.langKey}"]`);
            if (!originalElement) return;
            const originalStyle = window.getComputedStyle(originalElement);
            Object.assign(textEl.style, {
          fontFamily: originalStyle.fontFamily,
          fontSize: originalStyle.fontSize,
          fontWeight: originalStyle.fontWeight,
          lineHeight: "normal",
          color: originalStyle.color,
          textAlign: originalStyle.textAlign,
            });
          });
          }
        },
      });

      const link = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);
      const filenamePrefix = translations[currentLang].exportFilenamePrefix || "Progress";
      link.download = `${filenamePrefix}_${today}.png`;
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error("Error exporting image:", err);
      let errorMessage = translations[currentLang].exportError;
      if (err.message.includes('not loaded')) errorMessage += " Please check your internet connection and try again.";
      else if (err.message.includes('not found')) errorMessage += " Please refresh the page and try again.";
      alert(errorMessage);
    } finally {
      // Restore button state
      exportButton.innerHTML = originalText;
      exportButton.disabled = false;
      exportButton.setAttribute('aria-label', '导出为图片');
      
      // Restart updates after export attempt
      if (!document.hidden) {
        animationFrameId = requestAnimationFrame(animationLoop);
        staticTimerId = setInterval(updateStaticElements, STATIC_UPDATE_INTERVAL);
      }
    }
  });
  
  document.addEventListener("visibilitychange", handleVisibilityChange);
  
  // 5. Start update loops if page is visible
  if (!document.hidden) {
    animationFrameId = requestAnimationFrame(animationLoop);
    updateStaticElements();
    staticTimerId = setInterval(updateStaticElements, STATIC_UPDATE_INTERVAL);
  }

  // 6. Trigger page load animation
  setTimeout(() => exportArea.classList.add('visible'), 50);
});