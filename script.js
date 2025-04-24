/*
 * JavaScript for Annual Progress Bar
 * This script handles the functionality of the annual progress bar, including
 * calculating the year's progress, updating the UI, handling user interactions,
 * and managing language and theme settings.
 */

// --- Configuration ---
const DEFAULT_COLOR = "#3b82f6"; // Default blue-500
const PERCENTAGE_PRECISION = 6; // Number of decimal places for live percentage
const UPDATE_INTERVAL = 100; // Milliseconds for live update
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

// --- Update UI ---
function updateUI() {
  currentProgressData = getYearProgressPrecise(); // Get latest data
  const progress = currentProgressData;
  const lang = currentLang;

  // Update progress bar width (use raw percentage) and color
  const percentageValue = progress.percentage;
  progressBarFill.style.width = `${percentageValue}%`;

  const savedColor = localStorage.getItem("progressBarColor") || DEFAULT_COLOR;
  progressBarFill.style.backgroundColor = savedColor;
  if (document.activeElement !== colorPicker) {
    // Avoid overwriting while user is picking
    colorPicker.value = savedColor;
  }

  // Update text elements
  percentageText.textContent = `${progress.displayPercentage}%`; // Display formatted percentage
  daysPassedText.textContent = (
    daysPassedText.dataset.template || translations[lang].daysPassedTemplate
  ).replace("{days}", progress.daysPassed);
  daysRemainingText.textContent = (
    daysRemainingText.dataset.template ||
    translations[lang].daysRemainingTemplate
  ).replace("{days}", progress.daysRemaining);
  totalDaysText.textContent = `${progress.totalDaysInYear}`;
}

// --- Theme Handling ---
function applyTheme(theme) {
  if (theme === "dark") {
    htmlElement.classList.add("dark");
    themeIconLight.classList.add("hidden");
    themeIconDark.classList.remove("hidden");
  } else {
    htmlElement.classList.remove("dark");
    themeIconLight.classList.remove("hidden");
    themeIconDark.classList.add("hidden");
  }
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
      // Success feedback: Temporarily change tooltip
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
      // Optional: Show error feedback to user
    });
}

// --- Start/Stop Updates based on Visibility ---
function handleVisibilityChange() {
  if (document.hidden) {
    if (updateTimer) {
      clearInterval(updateTimer);
      updateTimer = null;
    }
  } else {
    if (!updateTimer) {
      updateUI(); // Update immediately when visible again
      updateTimer = setInterval(updateUI, UPDATE_INTERVAL);
    }
  }
}

// --- Event Listeners ---
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
  const isDarkMode = htmlElement.classList.contains("dark");
  const newTheme = isDarkMode ? "light" : "dark";
  applyTheme(newTheme);
  localStorage.setItem("theme", newTheme);
});

languageToggle.addEventListener("click", () => {
  const newLang = currentLang === "zh-CN" ? "en" : "zh-CN";
  setLanguage(newLang);
});

copyButton.addEventListener("click", copyToClipboard);

exportButton.addEventListener("click", () => {
  // Stop updates during export to prevent partial renders
  if (updateTimer) clearInterval(updateTimer);

  const computedStyle = window.getComputedStyle(exportArea);
  let finalBgColor = computedStyle.backgroundColor;
  if (!finalBgColor || finalBgColor === "rgba(0, 0, 0, 0)") {
    finalBgColor = window.getComputedStyle(document.body).backgroundColor;
  }

  html2canvas(exportArea, {
    useCORS: true,
    backgroundColor: finalBgColor,
    /* --- Increased scale for higher resolution --- */
    scale: 3, // Experiment with 3 or higher if needed
    // scale: window.devicePixelRatio || 2, // Previous method
    logging: false, // Disable logging unless debugging
    onclone: (clonedDoc) => {
      // Attempts to fix rendering issues in the clone
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
            // Apply critical styles explicitly
            textEl.style.fontFamily = originalStyle.fontFamily;
            textEl.style.fontSize = originalStyle.fontSize;
            textEl.style.fontWeight = originalStyle.fontWeight;
            textEl.style.lineHeight = "normal"; // Force normal line height
            textEl.style.color = originalStyle.color;
            textEl.style.textAlign = originalStyle.textAlign;
            textEl.style.verticalAlign = "baseline"; // Force baseline alignment
          });
      }
    },
  })
    .then((canvas) => {
      const link = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);
      const filenamePrefix =
        translations[currentLang].exportFilenamePrefix || "Progress";
      link.download = `${filenamePrefix}_${today}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    })
    .catch((err) => {
      console.error("Error exporting image:", err);
      alert(translations[currentLang].exportError || "Error exporting image.");
    })
    .finally(() => {
      // Restart updates after export attempt
      if (!document.hidden && !updateTimer) {
        updateTimer = setInterval(updateUI, UPDATE_INTERVAL);
      }
    });
});

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
    updateTimer = setInterval(updateUI, UPDATE_INTERVAL);
  }
});
