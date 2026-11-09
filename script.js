
// ================================================
// MS9 QURAN KAREEM - COMPLETE JAVASCRIPT
// ================================================

// HTML ELEMENTS
const surahList = document.getElementById("surahList");
const searchInput = document.getElementById("search");
const surahTitle = document.getElementById("surahTitle");
const versesContainer = document.getElementById("verses");

const lastRead = document.getElementById("lastRead");
const versesRead = document.getElementById("versesRead");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

const bookmarkList = document.getElementById("bookmarkList");

// API
const API = "https://api.alquran.cloud/v1";

// APPLICATION STATE
let allSurahs = [];
let selectedSurah = null;

let allSurahAyahs = [];
let currentPageAyahs = [];

let pageNumbers = [];
let currentPageIndex = 0;
let currentAyahIndex = 0;

let arabicFontSize = 38;

// AUDIO STATE
const currentAudio = new Audio();

let surahAudioList = [];
let audioAyahIndex = 0;
let isSurahPlaying = false;
let audioRequestId = 0;
let selectedReciter = "ar.alafasy";

// SWIPE STATE
let touchStartX = 0;
let touchEndX = 0;

// STORAGE
const BOOKMARK_KEY = "ms9QuranBookmarks";
const PROGRESS_KEY = "ms9QuranProgress";

// ================================================
// 1. LOAD ALL 114 SURAHS
// ================================================

async function loadSurahs() {
    if (!surahList) return;

    surahList.textContent = "Loading all Surahs...";

    try {
        const response = await fetch(`${API}/surah`);

        if (!response.ok) {
            throw new Error("Surah API request failed");
        }

        const data = await response.json();

        if (data.code !== 200) {
            throw new Error("Unable to load Surahs");
        }

        allSurahs = data.data;

        displaySurahs(allSurahs);

    } catch (error) {
        console.error("Surah loading error:", error);

        surahList.textContent =
            "Unable to load Surahs. Check your internet connection.";
    }
}

// ================================================
// 2. DISPLAY SURAH LIST
// ================================================

function displaySurahs(surahs) {
    if (!surahList) return;

    surahList.innerHTML = "";

    if (!surahs.length) {
        surahList.textContent = "No Surah found.";
        return;
    }

    surahs.forEach((surah) => {

        const item = document.createElement("button");
        item.className = "surah-item";

        const number = document.createElement("span");
        number.className = "surah-number";
        number.textContent = surah.number;

        const details = document.createElement("span");
        details.className = "surah-details";

        const englishName = document.createElement("strong");
        englishName.textContent = surah.englishName;

        const description = document.createElement("small");
        description.textContent =
            `${surah.englishNameTranslation} • ${surah.numberOfAyahs} Verses`;

        details.appendChild(englishName);
        details.appendChild(description);

        const arabicName = document.createElement("span");
        arabicName.className = "surah-arabic";
        arabicName.textContent = surah.name;

        item.appendChild(number);
        item.appendChild(details);
        item.appendChild(arabicName);

        item.addEventListener("click", () => {
            loadSurah(surah.number);
        });

        surahList.appendChild(item);
    });
}

// ================================================
// 3. SEARCH SURAHS
// ================================================

if (searchInput) {

    searchInput.addEventListener("input", () => {

        const value = searchInput.value
            .toLowerCase()
            .trim();

        const filtered = allSurahs.filter(surah => {

            return (
                surah.englishName.toLowerCase().includes(value) ||
                surah.englishNameTranslation.toLowerCase().includes(value) ||
                surah.name.includes(value) ||
                String(surah.number).includes(value)
            );

        });

        displaySurahs(filtered);
    });
}

// ================================================
// 4. LOAD SELECTED SURAH
// ================================================

async function loadSurah(surahNumber) {

    selectedSurah = allSurahs.find(
        surah => surah.number === Number(surahNumber)
    );

    if (!selectedSurah) return;

    // Stop old audio
    stopSurahAudio();

    surahTitle.textContent =
        `${selectedSurah.name} — ${selectedSurah.englishName}`;

    versesContainer.innerHTML =
        `<p class="loading-message">Loading Quran...</p>`;

    try {

        const response = await fetch(
            `${API}/surah/${surahNumber}/quran-uthmani`
        );

        if (!response.ok) {
            throw new Error("Surah request failed");
        }

        const data = await response.json();

        if (data.code !== 200) {
            throw new Error("Unable to load Surah");
        }

        allSurahAyahs = data.data.ayahs;

        currentAyahIndex = 0;

        // Find all Mushaf page numbers for this Surah
        pageNumbers = [
            ...new Set(allSurahAyahs.map(ayah => ayah.page))
        ].sort((a, b) => a - b);

        currentPageIndex = 0;

        // Load audio separately
        loadSurahAudio();

        await showPage();

        saveLastRead(
            selectedSurah.number,
            selectedSurah.englishName
        );

    } catch (error) {

        console.error("Load Surah error:", error);

        versesContainer.textContent =
            "Unable to load Quran. Please check your internet connection.";
    }
}



// ================================================
// 5. DISPLAY QURAN PAGE
// ================================================

async function showPage() {

    if (!selectedSurah || !pageNumbers.length) return;

    const actualPage = pageNumbers[currentPageIndex];

    versesContainer.innerHTML =
        `<p class="loading-message">Loading page ${actualPage}...</p>`;

    try {

        // Load Arabic Quran page
        const arabicResponse = await fetch(
            `${API}/page/${actualPage}/quran-uthmani`
        );

        if (!arabicResponse.ok) {
            throw new Error("Arabic page request failed");
        }

        const arabicData = await arabicResponse.json();

        // Load English translation
        const translationResponse = await fetch(
            `${API}/page/${actualPage}/en.sahih`
        );

        if (!translationResponse.ok) {
            throw new Error("Translation request failed");
        }

        const translationData = await translationResponse.json();

        if (
            arabicData.code !== 200 ||
            translationData.code !== 200
        ) {
            throw new Error("Unable to load Quran page");
        }

        const arabicAyahs = arabicData.data.ayahs;
        const translatedAyahs = translationData.data.ayahs;

        currentPageAyahs = arabicAyahs;

        // CREATE QURAN PAGE
        const page = document.createElement("div");
        page.className = "quran-page text-reader";

        // ========================================
        // READER CONTROLS
        // ========================================

        const readerControls = document.createElement("div");
        readerControls.className = "reader-controls";

        readerControls.innerHTML = `
            <div class="voice-selector">
                <label for="reciterSelect">Choose Reciter:</label>

                <select id="reciterSelect">
                    <option value="ar.alafasy">Mishary Rashid Alafasy</option>
                    <option value="ar.abdurrahmaansudais">Abdurrahman As-Sudais</option>
                    <option value="ar.husary">Mahmoud Khalil Al-Husary</option>
                    <option value="ar.minshawi">Mohamed Siddiq Al-Minshawi</option>
                </select>
            </div>

            <div class="audio-controls">
                <button id="playFullSurah">▶ Play Surah</button>
                <button id="pauseAudio">⏸ Pause</button>
                <button id="resumeAudio">▶ Resume</button>
                <button id="stopAudio">■ Stop</button>
                <button id="previousAudio">⏮ Previous Ayah</button>
                <button id="nextAudio">⏭ Next Ayah</button>
            </div>

            <p id="audioStatus">Ready</p>

            <div class="font-controls">
                <button id="increaseFont">A+</button>
                <button id="decreaseFont">A-</button>
            </div>
        `;

        // Keep selected reciter
        readerControls.querySelector("#reciterSelect").value =
            selectedReciter;

        // Reciter change
        readerControls.querySelector("#reciterSelect")
            .addEventListener("change", async (event) => {

                selectedReciter = event.target.value;

                await loadSurahAudio();

                updateAudioStatus("Voice changed. Ready to play.");
            });

        // Audio buttons
        readerControls.querySelector("#playFullSurah")
            .addEventListener("click", playFullSurah);

        readerControls.querySelector("#pauseAudio")
            .addEventListener("click", pauseSurahAudio);

        readerControls.querySelector("#resumeAudio")
            .addEventListener("click", resumeSurahAudio);

        readerControls.querySelector("#stopAudio")
            .addEventListener("click", stopSurahAudio);

        readerControls.querySelector("#nextAudio")
            .addEventListener("click", nextAudioAyah);

        readerControls.querySelector("#previousAudio")
            .addEventListener("click", previousAudioAyah);

        // Font increase
        readerControls.querySelector("#increaseFont")
            .addEventListener("click", () => {

                arabicFontSize = Math.min(arabicFontSize + 4, 64);

                document.querySelectorAll(".arabic-ayah").forEach(el => {
                    el.style.fontSize = `${arabicFontSize}px`;
                });
            });

        // Font decrease
        readerControls.querySelector("#decreaseFont")
            .addEventListener("click", () => {

                arabicFontSize = Math.max(arabicFontSize - 4, 22);

                document.querySelectorAll(".arabic-ayah").forEach(el => {
                    el.style.fontSize = `${arabicFontSize}px`;
                });
            });

        page.appendChild(readerControls);

        // ========================================
        // PAGE HEADING
        // ========================================

        const pageHeading = document.createElement("div");
        pageHeading.className = "page-heading";

        pageHeading.innerHTML = `
            <h3>${selectedSurah.name}</h3>
            <p>${selectedSurah.englishName}</p>
            <span>Mushaf Page ${actualPage}</span>
        `;

        page.appendChild(pageHeading);

        // ========================================
        // ARABIC AND ENGLISH AYAH CARDS
        // ========================================

        const arabicContainer = document.createElement("div");
        arabicContainer.className = "arabic-verses";

        arabicAyahs.forEach((ayah) => {

            const translatedAyah = translatedAyahs.find(
                item => item.number === ayah.number
            );

            const card = document.createElement("article");
            card.className = "ayah-card";

            // Arabic text
            const arabicText = document.createElement("p");
            arabicText.className = "arabic-ayah";
            arabicText.textContent = ayah.text;
            arabicText.style.fontSize = `${arabicFontSize}px`;
            arabicText.dir = "rtl";

            // English translation
            const translation = document.createElement("p");
            translation.className = "ayah-translation";

            translation.textContent = translatedAyah
                ? translatedAyah.text
                : "Translation unavailable.";
            // Ayah reference
            const reference = document.createElement("span");
            reference.className = "ayah-reference";

            reference.textContent =
                `${ayah.surah.name} • Surah ${ayah.surah.number} • Ayah ${ayah.numberInSurah}`;

            // Action buttons
            const actions = document.createElement("div");
            actions.className = "ayah-actions";

            // Individual audio
            const audioButton = document.createElement("button");
            audioButton.className = "audio-button";
            audioButton.textContent = "▶ Listen";

            audioButton.addEventListener("click", () => {

                const index = allSurahAyahs.findIndex(
                    item => item.number === ayah.number
                );

                if (index !== -1) {
                    audioAyahIndex = index;
                    isSurahPlaying = true;
                    playAudioAyah();
                }
            });

            // Bookmark
            const bookmarkButton = document.createElement("button");
            bookmarkButton.className = "bookmark-button";

            const bookmarkId =
                `${ayah.surah.number}:${ayah.numberInSurah}`;

            bookmarkButton.textContent = isBookmarked(bookmarkId)
                ? "★ Bookmarked"
                : "☆ Bookmark";

            bookmarkButton.addEventListener("click", () => {

                toggleBookmark(
                    bookmarkId,
                    ayah.surah.number,
                    ayah.surah.name,
                    ayah.numberInSurah,
                    ayah.text
                );

                bookmarkButton.textContent =
                    isBookmarked(bookmarkId)
                        ? "★ Bookmarked"
                        : "☆ Bookmark";

                displayBookmarks();
            });

            actions.appendChild(audioButton);
            actions.appendChild(bookmarkButton);

            card.appendChild(arabicText);
            card.appendChild(translation);
            card.appendChild(reference);
            card.appendChild(actions);

            arabicContainer.appendChild(card);

            saveVerseProgress(bookmarkId);
        });

        page.appendChild(arabicContainer);

        // ========================================
        // PREVIOUS / NEXT PAGE
        // ========================================

        const navigation = document.createElement("div");
        navigation.className = "page-navigation";

        const previousButton = document.createElement("button");
        previousButton.textContent = "← Previous Page";
        previousButton.disabled = currentPageIndex === 0;

        previousButton.addEventListener("click", previousPage);

        const pageNumber = document.createElement("span");
        pageNumber.className = "page-number";

        pageNumber.textContent =
            `Page ${currentPageIndex + 1} of ${pageNumbers.length}`;

        const nextButton = document.createElement("button");
        nextButton.textContent = "Next Page →";

        nextButton.disabled =
            currentPageIndex === pageNumbers.length - 1;

        nextButton.addEventListener("click", nextPage);

        navigation.appendChild(previousButton);
        navigation.appendChild(pageNumber);
        navigation.appendChild(nextButton);

        page.appendChild(navigation);

        // DISPLAY COMPLETE QURAN PAGE
        versesContainer.innerHTML = "";
        versesContainer.appendChild(page);

        updateReadingProgress();

        versesContainer.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {

        console.error("Quran page error:", error);

        versesContainer.innerHTML = `
            <p class="error-message">
                Unable to load this Quran page.
                Please check your internet connection and refresh.
            </p>
        `;
    }
}



// ================================================
// 6. PAGE NAVIGATION
// ================================================

function nextPage() {

    if (currentPageIndex < pageNumbers.length - 1) {
        currentPageIndex++;
        showPage();
    }
}

function previousPage() {

    if (currentPageIndex > 0) {
        currentPageIndex--;
        showPage();
    }
}

// ================================================
// 7. MOBILE SWIPE
// ================================================

if (versesContainer) {

    versesContainer.addEventListener("touchstart", event => {
        touchStartX = event.changedTouches[0].screenX;
    }, { passive: true });

    versesContainer.addEventListener("touchend", event => {

        touchEndX = event.changedTouches[0].screenX;

        const difference = touchStartX - touchEndX;

        if (Math.abs(difference) < 60) return;

        if (difference > 0) {
            nextPage();
        } else {
            previousPage();
        }

    }, { passive: true });
}

// ================================================
// 8. BOOKMARK SYSTEM
// ================================================

function getBookmarks() {

    try {
        return JSON.parse(
            localStorage.getItem(BOOKMARK_KEY)
        ) || [];
    } catch {
        return [];
    }
}

function isBookmarked(id) {

    return getBookmarks().some(
        bookmark => bookmark.id === id
    );
}

function toggleBookmark(
    id,
    surahNumber,
    surahName,
    ayahNumber,
    arabicText
) {

    const bookmarks = getBookmarks();

    const index = bookmarks.findIndex(
        bookmark => bookmark.id === id
    );

    if (index >= 0) {

        bookmarks.splice(index, 1);

    } else {

        bookmarks.push({
            id,
            surahNumber,
            surahName,
            ayahNumber,
            arabicText
        });
    }

    localStorage.setItem(
        BOOKMARK_KEY,
        JSON.stringify(bookmarks)
    );
}

function displayBookmarks() {

    if (!bookmarkList) return;

    bookmarkList.innerHTML = "";

    const bookmarks = getBookmarks();

    if (!bookmarks.length) {
        bookmarkList.textContent = "No bookmarks yet.";
        return;
    }

    bookmarks.forEach(bookmark => {

        const item = document.createElement("div");
        item.className = "bookmark-item";

        const title = document.createElement("p");
        title.textContent =
            `${bookmark.surahName} • Ayah ${bookmark.ayahNumber}`;

        const arabic = document.createElement("p");
        arabic.className = "bookmark-arabic";
        arabic.textContent = bookmark.arabicText;

        const openButton = document.createElement("button");
        openButton.textContent = "Open Surah";

        openButton.addEventListener("click", async () => {

            await loadSurah(bookmark.surahNumber);

            currentAyahIndex = allSurahAyahs.findIndex(
                ayah => ayah.numberInSurah === bookmark.ayahNumber
            );

        });

        const removeButton = document.createElement("button");
        removeButton.textContent = "Remove";

        removeButton.addEventListener("click", () => {
            removeBookmark(bookmark.id);
        });

        item.appendChild(title);
        item.appendChild(arabic);
        item.appendChild(openButton);
        item.appendChild(removeButton);

        bookmarkList.appendChild(item);
    });
}

function removeBookmark(id) {

    const bookmarks = getBookmarks().filter(
        bookmark => bookmark.id !== id
    );

    localStorage.setItem(
        BOOKMARK_KEY,
        JSON.stringify(bookmarks)
    );

    displayBookmarks();

    if (selectedSurah) {
        showPage();
    }
}

// ================================================
// 9. READING PROGRESS
// ================================================

function getProgress() {

    try {
        return JSON.parse(
            localStorage.getItem(PROGRESS_KEY)
        ) || [];
    } catch {
        return [];
    }
}

function saveVerseProgress(id) {

    const progress = getProgress();

    if (!progress.includes(id)) {

        progress.push(id);

        localStorage.setItem(
            PROGRESS_KEY,
            JSON.stringify(progress)
        );
    }
}

function saveLastRead(number, name) {

    localStorage.setItem(
        "ms9LastRead",
        JSON.stringify({ number, name })
    );

    if (lastRead) {
        lastRead.textContent = `${name} (${number})`;
    }
}

function updateReadingProgress() {

    const progress = getProgress();

    if (versesRead) {
        versesRead.textContent = progress.length;
    }

    const percentage = Math.min(
        (progress.length / 6236) * 100,
        100
    );

    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }

    if (progressText) {
        progressText.textContent =
            `${percentage.toFixed(1)}% completed`;
    }
}

// ================================================
// 10. RESTORE LAST READ
// ================================================

function restoreLastRead() {

    const saved = localStorage.getItem("ms9LastRead");

    if (!saved) return;

    try {

        const data = JSON.parse(saved);

        if (lastRead) {
            lastRead.textContent =
                `${data.name} (${data.number})`;
        }

    } catch (error) {
        console.error("Last read restore error:", error);
    }
}

// ================================================
// 11. LOAD FULL SURAH AUDIO
// ================================================

async function loadSurahAudio() {
    if (!selectedSurah) return;

    try {
        const requestId = ++audioRequestId;

        currentAudio.pause();
        isSurahPlaying = false;
        surahAudioList = [];
        audioAyahIndex = 0;

        const response = await fetch(
            `${API}/surah/${selectedSurah.number}/${selectedReciter}`
        );

        if (!response.ok) {
            throw new Error("Audio request failed");
        }

        const result = await response.json();

        if (requestId !== audioRequestId) return;

        if (result.code !== 200) {
            throw new Error("Audio unavailable");
        }

        surahAudioList = result.data.ayahs.map(
            ayah => ayah.audio
        );

        updateAudioStatus("Ready to play");

    } catch (error) {
        console.error("Audio loading error:", error);
        updateAudioStatus("Audio could not be loaded");
    }
}

// ================================================
// 12. AUDIO STATUS
// ================================================

function updateAudioStatus(message) {

    const status = document.getElementById("audioStatus");

    if (status) {
        status.textContent = message;
    }
}

// ================================================
// 13. PLAY FULL SURAH
// ================================================

async function playFullSurah() {

    if (!selectedSurah) return;

    if (!surahAudioList.length) {
        await loadSurahAudio();
    }

    if (!surahAudioList.length) {
        updateAudioStatus("Audio unavailable");
        return;
    }

    isSurahPlaying = true;

    playAudioAyah();
}

// ================================================
// 14. PLAY CURRENT AUDIO AYAH
// ================================================

function playAudioAyah() {

    if (!isSurahPlaying) return;

    if (audioAyahIndex >= surahAudioList.length) {

        stopSurahAudio();

        updateAudioStatus("Surah completed");

        return;
    }

    currentAudio.pause();

    currentAudio.src = surahAudioList[audioAyahIndex];
    function playAudioAyah() {
    if (!isSurahPlaying) return;

    if (audioAyahIndex >= surahAudioList.length) {
        stopSurahAudio();
        updateAudioStatus("Surah completed");
        return;
    }

    currentAudio.pause();
    currentAudio.src = surahAudioList[audioAyahIndex];

    

    updateAudioStatus(
        `Playing Ayah ${audioAyahIndex + 1} of ${surahAudioList.length}`
    );

    currentAudio.onended = () => {
        if (!isSurahPlaying) return;

        audioAyahIndex++;
        playAudioAyah();
    };

    currentAudio.play().catch(error => {
        console.error("Audio playback error:", error);
        isSurahPlaying = false;
        updateAudioStatus("Unable to play audio");
    });
}

    updateAudioStatus(
        `Playing Ayah ${audioAyahIndex + 1} of ${surahAudioList.length}`
    );

    currentAudio.onended = () => {

        if (!isSurahPlaying) return;

        audioAyahIndex++;

        playAudioAyah();
    };

    currentAudio.play().catch(error => {

        console.error("Audio playback error:", error);

        isSurahPlaying = false;

        updateAudioStatus("Unable to play audio");
    });
}

// ================================================
// 15. PAUSE AUDIO
// ================================================

function pauseSurahAudio() {

    currentAudio.pause();

    isSurahPlaying = false;

    updateAudioStatus("Paused");
}

// ================================================
// 16. RESUME AUDIO
// ================================================

function resumeSurahAudio() {

    if (!surahAudioList.length) return;

    if (audioAyahIndex >= surahAudioList.length) {
        audioAyahIndex = 0;
    }

    isSurahPlaying = true;

    if (currentAudio.src && currentAudio.currentTime > 0) {

        currentAudio.play().catch(error => {
            console.error(error);
            updateAudioStatus("Unable to resume audio");
        });

        updateAudioStatus("Playing");

    } else {

        playAudioAyah();
    }
}

// ================================================
// 17. STOP AUDIO
// ================================================

function stopSurahAudio() {

    isSurahPlaying = false;

    currentAudio.pause();

    currentAudio.currentTime = 0;

    currentAudio.onended = null;

    audioAyahIndex = 0;

    updateAudioStatus("Stopped");
}

// ================================================
// 18. NEXT AUDIO AYAH
// ================================================

function nextAudioAyah() {

    if (!surahAudioList.length) return;

    if (audioAyahIndex < surahAudioList.length - 1) {

        audioAyahIndex++;

        isSurahPlaying = true;

        playAudioAyah();
    }
}

// ================================================
// 19. PREVIOUS AUDIO AYAH
// ================================================

function previousAudioAyah() {

    if (!surahAudioList.length) return;

    if (audioAyahIndex > 0) {

        audioAyahIndex--;

        isSurahPlaying = true;

        playAudioAyah();
    }
}

// ================================================
// 20. START WEBSITE
// ================================================

loadSurahs();

displayBookmarks();

restoreLastRead();

updateReadingProgress();
