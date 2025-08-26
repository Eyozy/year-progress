/*
 * JavaScript for Annual Progress Bar
 * This script handles the functionality of the annual progress bar, including
 * calculating the year's progress, updating the UI, handling user interactions,
 * and managing language and theme settings.
 */

// --- Configuration ---
const DEFAULT_COLOR = "#3b82f6"; // Default blue-500
const PERCENTAGE_PRECISION = 6; // Number of decimal places for live percentage
const UPDATE_INTERVAL = 500; // Milliseconds for live update (optimized from 100ms)
const CLIPBOARD_BLOCKS_TOTAL = 15; // Total blocks for clipboard format
const CLIPBOARD_BLOCK_FILLED = "▓";
const CLIPBOARD_BLOCK_EMPTY = "░";
const DEBOUNCE_DELAY = 200; // Debounce delay for UI updates

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
const htmlElement = document.documentElement; // Changed from body to html for dark mode class

let currentLang = "zh-CN"; // Default language
let updateTimer = null; // Timer for interval
let currentProgressData = {}; // Store latest progress data
let debounceTimeout = null; // Timeout for debouncing UI updates

// --- Date Calculation (High Precision) ---
function getYearProgressPrecise() {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1); // Jan 1st, 00:00:00

  // Check for leap year
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const totalDaysInYear = isLeap ? 366 : 365;
  const totalMsInYear = totalDaysInYear * 24 * 60 * 60 * 1000;

  const msPassed = now - startOfYear;
  const percentage = Math.min(100, (msPassed / totalMsInYear) * 100); // Cap at 100%

  // Calculate full days passed (excluding today)
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysPassed = Math.floor(msPassed / msPerDay); // No +1 here

  // Correct calculation for remaining days
  const endOfYear = new Date(year + 1, 0, 1); // Start of next year
  const msRemaining = endOfYear - now;
  // Calculate remaining full days (floor rounds down)
  const daysRemaining = Math.floor(msRemaining / msPerDay);

  return {
    percentage: percentage, // Raw percentage for calculations
    displayPercentage: percentage.toFixed(PERCENTAGE_PRECISION), // Formatted for display
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
      if (
        (el.tagName === "BUTTON" || el.tagName === "INPUT") &&
        key.endsWith("Tooltip")
      ) {
        el.title = translation;
      } else if (key.endsWith("Template")) {
        el.dataset.template = translation;
      } else {
        el.textContent = translation;
      }
    } else {
      console.warn(
        `Translation key "${key}" not found for language "${lang}".`
      );
    }
  });

  // Reset copy button tooltip after language change
  copyButton.title = translations[currentLang].copyTooltip;

  updateUI(); // Update dynamic text
  localStorage.setItem("language", lang);
}

// --- Debounced Update UI ---
function debouncedUpdateUI() {
  // Clear any existing debounce timeout
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  
  // Set new timeout
  debounceTimeout = setTimeout(() => {
    updateUI();
  }, DEBOUNCE_DELAY);
}

// --- Update UI ---
function updateUI() {
  try {
    currentProgressData = getYearProgressPrecise(); // Get latest data
    const progress = currentProgressData;
    const lang = currentLang;

    // Validate progress data
    if (!progress || typeof progress.percentage !== 'number') {
      console.error('Invalid progress data:', progress);
      return;
    }

    // Update progress bar width (use raw percentage) and color
    const percentageValue = progress.percentage;
    progressBarFill.style.width = `${percentageValue}%`;

    // Update ARIA attributes for progress bar
    const progressTrack = document.querySelector('.progress-track');
    if (progressTrack) {
      progressTrack.setAttribute('aria-valuenow', Math.round(percentageValue));
      progressTrack.setAttribute('aria-valuetext', `${percentageValue.toFixed(1)}%`);
    }

    const savedColor = localStorage.getItem("progressBarColor") || DEFAULT_COLOR;
    progressBarFill.style.backgroundColor = savedColor;
    if (document.activeElement !== colorPicker) {
      // Avoid overwriting while user is picking
      colorPicker.value = savedColor;
    }

    // Update text elements with validation
    if (percentageText) {
      percentageText.textContent = `${progress.displayPercentage}%`;
      percentageText.setAttribute('aria-label', `当前进度：${progress.displayPercentage}%`);
    }
    if (daysPassedText) {
      const daysPassedTextContent = (
        daysPassedText.dataset.template || translations[lang].daysPassedTemplate
      ).replace("{days}", progress.daysPassed);
      daysPassedText.textContent = daysPassedTextContent;
      daysPassedText.setAttribute('aria-label', daysPassedTextContent);
    }
    if (daysRemainingText) {
      const daysRemainingTextContent = (
        daysRemainingText.dataset.template ||
        translations[lang].daysRemainingTemplate
      ).replace("{days}", progress.daysRemaining);
      daysRemainingText.textContent = daysRemainingTextContent;
      daysRemainingText.setAttribute('aria-label', daysRemainingTextContent);
    }
    if (totalDaysText) {
      totalDaysText.textContent = `${progress.totalDaysInYear}`;
      totalDaysText.setAttribute('aria-label', `总计${progress.totalDaysInYear}天`);
    }
  } catch (error) {
    console.error('Error updating UI:', error);
    // Attempt to recover by updating on next interval
  }
}

// --- Theme Configuration ---
const themes = {
  light: {
    class: '',
    icon: 'light'
  },
  dark: {
    class: 'dark',
    icon: 'dark'
  }
};

// --- Theme Handling ---
function applyTheme(theme) {
  // Remove all theme classes
  Object.values(themes).forEach(themeConfig => {
    if (themeConfig.class) {
      htmlElement.classList.remove(themeConfig.class);
    }
  });

  // Add new theme class if it exists
  const themeConfig = themes[theme];
  if (themeConfig && themeConfig.class) {
    htmlElement.classList.add(themeConfig.class);
  }

  // Update icon visibility
  const showLightIcon = themeConfig && themeConfig.icon === 'light';
  themeIconLight.classList.toggle('hidden', !showLightIcon);
  themeIconDark.classList.toggle('hidden', showLightIcon);
}

// --- Theme Toggle ---
function toggleTheme() {
  const isDarkMode = htmlElement.classList.contains('dark');
  const newTheme = isDarkMode ? 'light' : 'dark';
  applyTheme(newTheme);
  return newTheme;
}

// --- Toast Notification System ---
function showToast(message, type = 'success') {
  // Remove existing toast if any
  const existingToast = document.getElementById('toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.id = 'toast-notification';
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');

  // Add icon based on type
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  if (type === 'success') {
    icon.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
    `;
  } else if (type === 'error') {
    icon.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    `;
  }
  
  // Insert icon at the beginning
  toast.insertBefore(icon, toast.firstChild);

  // Add to DOM
  document.body.appendChild(toast);

  // Show toast with animation
  setTimeout(() => {
    toast.classList.add('toast-show');
  }, 10);

  // Auto hide after 3 seconds
  setTimeout(() => {
    hideToast(toast);
  }, 3000);
}

function hideToast(toast) {
  if (!toast) return;
  
  toast.classList.remove('toast-show');
  
  // Remove from DOM after animation completes
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
}

// --- Clipboard Handling ---
function copyToClipboard() {
  const progress = currentProgressData; // Use last calculated data
  if (!progress || typeof progress.percentage !== "number") return; // Guard

  const percentageValue = progress.percentage;
  const numFilled = Math.round(
    percentageValue / (100 / CLIPBOARD_BLOCKS_TOTAL)
  );
  const numEmpty = CLIPBOARD_BLOCKS_TOTAL - numFilled;

  const clipboardText =
    CLIPBOARD_BLOCK_FILLED.repeat(numFilled) +
    CLIPBOARD_BLOCK_EMPTY.repeat(numEmpty) +
    ` ${percentageValue.toFixed(0)}%`; // Use rounded percentage here

  navigator.clipboard
    .writeText(clipboardText)
    .then(() => {
      // Show success toast notification
      showToast(translations[currentLang].copiedTooltip, 'success');
      
      // Also update tooltip for additional feedback
      const originalTitle = copyButton.title;
      copyButton.title = translations[currentLang].copiedTooltip;
      setTimeout(() => {
        if (copyButton.title === translations[currentLang].copiedTooltip) {
          // Check if tooltip wasn't changed by lang switch
          copyButton.title = translations[currentLang].copyTooltip; // Restore original language tooltip
        }
      }, 1500); // Restore after 1.5 seconds
    })
    .catch((err) => {
      console.error("Failed to copy text: ", err);
      // Show error toast notification
      showToast(translations[currentLang].copyFailed, 'error');
    });
}

// --- Start/Stop Updates based on Visibility ---
function handleVisibilityChange() {
  if (document.hidden) {
    if (updateTimer) {
      clearInterval(updateTimer);
      updateTimer = null;
    }
    // Clear any pending debounced updates
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
      debounceTimeout = null;
    }
  } else {
    if (!updateTimer) {
      updateUI(); // Update immediately when visible again
      updateTimer = setInterval(debouncedUpdateUI, UPDATE_INTERVAL);
    }
  }
}

// --- Event Listeners are now managed in DOMContentLoaded for proper cleanup ---

// --- Cleanup Function ---
function cleanup() {
  // Clear all timers and timeouts
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
  }
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
    debounceTimeout = null;
  }
  
  // Remove event listeners
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  colorPicker.removeEventListener("input", colorPicker._inputHandler);
  resetColorButton.removeEventListener("click", resetColorButton._clickHandler);
  themeToggle.removeEventListener("click", themeToggle._clickHandler);
  languageToggle.removeEventListener("click", languageToggle._clickHandler);
  copyButton.removeEventListener("click", copyButton._clickHandler);
  exportButton.removeEventListener("click", exportButton._clickHandler);
  
  // Remove page unload listener
  window.removeEventListener("beforeunload", cleanup);
}

// Page Visibility Listener
document.addEventListener("visibilitychange", handleVisibilityChange, false);

// --- Initial Load ---
document.addEventListener("DOMContentLoaded", () => {
  // 1. Load Language
  const savedLang = localStorage.getItem("language");
  const browserLang = navigator.language || navigator.userLanguage;
  let initialLang = "zh-CN";
  if (savedLang && translations[savedLang]) {
    initialLang = savedLang;
  } else if (browserLang.startsWith("en") && translations["en"]) {
    initialLang = "en";
  } else if (browserLang.startsWith("zh") && translations["zh-CN"]) {
    initialLang = "zh-CN";
  }
  setLanguage(initialLang); // This calls updateUI

  // 2. Load Theme
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
  applyTheme(initialTheme);

  // 3. Initial UI update and start timer if page is visible
  if (!document.hidden) {
    updateUI(); // Initial calculation
    updateTimer = setInterval(debouncedUpdateUI, UPDATE_INTERVAL); // Use debounced updates
  }
  
  // 4. Store event handlers for cleanup
  colorPicker._inputHandler = (event) => {
    const newColor = event.target.value;
    progressBarFill.style.backgroundColor = newColor;
    localStorage.setItem("progressBarColor", newColor);
  };
  
  resetColorButton._clickHandler = () => {
    progressBarFill.style.backgroundColor = DEFAULT_COLOR;
    colorPicker.value = DEFAULT_COLOR;
    localStorage.setItem("progressBarColor", DEFAULT_COLOR);
  };
  
  themeToggle._clickHandler = () => {
    const newTheme = toggleTheme();
    localStorage.setItem("theme", newTheme);
  };
  
  languageToggle._clickHandler = () => {
    const newLang = currentLang === "zh-CN" ? "en" : "zh-CN";
    setLanguage(newLang);
  };
  
  copyButton._clickHandler = copyToClipboard;
  
  exportButton._clickHandler = async () => {
    // Stop updates during export to prevent partial renders
    if (updateTimer) clearInterval(updateTimer);

    // Show loading state with clear visual feedback
    const originalText = exportButton.innerHTML;
    const originalClasses = exportButton.className;
    exportButton.innerHTML = `
      <svg style="stroke: var(--button-text-color); animation: spin 1s linear infinite;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m-15.357-2a8.001 8.001 0 0015.357 2m0 0H15"></path>
      </svg>
    `;
    exportButton.disabled = true;
    exportButton.setAttribute('aria-label', '导出中，请稍候...');

    try {
      // Check if html2canvas is available
      if (typeof html2canvas === 'undefined') {
        throw new Error('html2canvas library not loaded');
      }

      // Check if export area exists
      if (!exportArea) {
        throw new Error('Export area not found');
      }

      const computedStyle = window.getComputedStyle(exportArea);
      let finalBgColor = computedStyle.backgroundColor;
      if (!finalBgColor || finalBgColor === "rgba(0, 0, 0, 0)") {
        finalBgColor = window.getComputedStyle(document.body).backgroundColor;
      }

      const canvas = await html2canvas(exportArea, {
        useCORS: true,
        backgroundColor: finalBgColor,
        scale: 6,
        logging: false,
        onclone: (clonedDoc) => {
          const clonedExportArea = clonedDoc.getElementById("export-area");
          if (clonedExportArea) {
            clonedExportArea.style.backgroundColor = finalBgColor;
            clonedExportArea
              .querySelectorAll(
                '#percentage, #days-passed, #days-remaining, [data-lang-key="totalDaysPrefix"], #total-days, [data-lang-key="totalDaysSuffix"], [data-lang-key="title"]'
              )
              .forEach((textEl) => {
                const originalElement =
                  document.getElementById(textEl.id) ||
                  document.querySelector(
                    `[data-lang-key="${textEl.dataset.langKey}"]`
                  );
                if (!originalElement) return;
                const originalStyle = window.getComputedStyle(originalElement);
                textEl.style.fontFamily = originalStyle.fontFamily;
                textEl.style.fontSize = originalStyle.fontSize;
                textEl.style.fontWeight = originalStyle.fontWeight;
                textEl.style.lineHeight = "normal";
                textEl.style.color = originalStyle.color;
                textEl.style.textAlign = originalStyle.textAlign;
                textEl.style.verticalAlign = "baseline";
              });
          }
        },
      });

      // Create download link
      const link = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);
      const filenamePrefix =
        translations[currentLang].exportFilenamePrefix || "Progress";
      link.download = `${filenamePrefix}_${today}.png`;
      link.href = canvas.toDataURL("image/png");
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error("Error exporting image:", err);
      
      // Show more detailed error message
      let errorMessage = translations[currentLang].exportError || "Error exporting image.";
      if (err.message.includes('not loaded')) {
        errorMessage += " Please check your internet connection and try again.";
      } else if (err.message.includes('not found')) {
        errorMessage += " Please refresh the page and try again.";
      }
      
      alert(errorMessage);
    } finally {
      // Restore button state
      exportButton.innerHTML = originalText;
      exportButton.className = originalClasses;
      exportButton.disabled = false;
      exportButton.setAttribute('aria-label', '导出为图片');
      
      // Restart updates after export attempt
      if (!document.hidden && !updateTimer) {
        updateTimer = setInterval(debouncedUpdateUI, UPDATE_INTERVAL);
      }
    }
  };
  
  // Add event listeners
  colorPicker.addEventListener("input", colorPicker._inputHandler);
  resetColorButton.addEventListener("click", resetColorButton._clickHandler);
  themeToggle.addEventListener("click", themeToggle._clickHandler);
  languageToggle.addEventListener("click", languageToggle._clickHandler);
  copyButton.addEventListener("click", copyButton._clickHandler);
  exportButton.addEventListener("click", exportButton._clickHandler);
  
  // Add cleanup on page unload
  window.addEventListener("beforeunload", cleanup);
});
