import { computeBuckets } from "@/lib/pagination/buckets";
import {
  escapeHtml,
  filterRecords,
  paginateRecords,
  parseSseChunk,
  sortRecords,
  uniqueEffectiveSizes,
  type BrowserRecord,
  type SortBy,
} from "./record-helpers";

interface SyncProgress {
  phase: "pull" | "push" | "done";
  pulled: number;
  pushed: number;
  skipped: number;
  errors: string[];
  totalDiscogsItems: number;
}

interface DiscogsSearchResult {
  id: number;
  title: string;
  year?: string;
  thumb?: string;
  catno?: string;
  recordSize?: string | null;
  vinylColor?: string | null;
  isShapedVinyl?: boolean;
}

type PageSize = 25 | 50 | 100;
type SearchMethod = "artistTitle" | "catalog" | "upc";

const PAGE_SIZE_OPTIONS: PageSize[] = [25, 50, 100];

const state = {
  records: [] as BrowserRecord[],
  sortBy: "artist" as SortBy,
  sortAsc: true,
  showFilters: false,
  sizeFilter: new Set<string>(),
  shapedOnly: false,
  activeBucket: null as string | null,
  pageSize: (window.innerWidth > 640 ? 50 : 25) as PageSize,
  currentPage: 1,
  searchMethod: "artistTitle" as SearchMethod,
};

function query<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

function show(element: HTMLElement, visible: boolean): void {
  element.hidden = !visible;
}

function setHtml(selector: string, value: string): void {
  query<HTMLElement>(selector).innerHTML = value;
}

function clearMessage(selector: string): void {
  const element = query<HTMLElement>(selector);
  element.textContent = "";
  element.hidden = true;
}

function showMessage(selector: string, message: string): void {
  const element = query<HTMLElement>(selector);
  element.textContent = message;
  element.hidden = false;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) {
    const message = typeof data?.message === "string"
      ? data.message
      : typeof data?.error === "string" ? data.error : "Request failed";
    throw new Error(message);
  }
  return data as T;
}

async function checkSyncStatus(): Promise<void> {
  try {
    const data = await fetchJson<{ ready: boolean; missing: string[] }>("/api/records/sync/status");
    if (!data.ready) {
      setHtml(
        "[data-sync-warning-content]",
        `Sync requires ${escapeHtml(data.missing.join(" and "))} — set ${data.missing.length === 1 ? "it" : "them"} in your <code>.env</code> file.`,
      );
      show(query<HTMLElement>("[data-sync-warning]"), true);
    }
  } catch {
    show(query<HTMLElement>("[data-sync-warning]"), false);
  }
}

async function loadRecords(): Promise<void> {
  const shelfRoot = query<HTMLElement>("[data-shelf-root]");
  shelfRoot.innerHTML = `
    <div class="stateCenter">
      <div class="spinner"></div>
      <p class="loadingText">Loading your collection...</p>
    </div>
  `;

  try {
    const data = await fetchJson<{ records: BrowserRecord[] }>("/api/records");
    state.records = data.records || [];
    renderShelf();
  } catch (error) {
    shelfRoot.innerHTML = `
      <div class="stateCenter">
        <p class="errorText">${escapeHtml(error instanceof Error ? error.message : "Failed to load records")}</p>
      </div>
    `;
  }
}

function visibleRecords(): BrowserRecord[] {
  const filtered = filterRecords(state.records, state.sizeFilter, state.shapedOnly);
  const sorted = sortRecords(filtered, state.sortBy, state.sortAsc);
  if (state.activeBucket === null || state.sortBy !== "artist") return sorted;
  const bucket = computeBuckets(sorted, state.pageSize).find((item) => item.label === state.activeBucket);
  if (!bucket) return sorted;
  const recordIds = new Set(bucket.recordIds);
  return sorted.filter((record) => recordIds.has(record.recordId));
}

function renderShelf(): void {
  const shelfRoot = query<HTMLElement>("[data-shelf-root]");

  if (state.records.length === 0) {
    shelfRoot.innerHTML = `
      <div class="stateCenter">
        <p class="emptyText">Your collection is empty. Click <strong>&ldquo;+ Add an album&rdquo;</strong> to get started.</p>
      </div>
    `;
    return;
  }

  const sortedForBuckets = sortRecords(filterRecords(state.records, state.sizeFilter, state.shapedOnly), state.sortBy, state.sortAsc);
  const alphaBuckets = state.sortBy === "artist" ? computeBuckets(sortedForBuckets, state.pageSize) : [];
  const displayedRecords = visibleRecords();
  const { pageRecords, totalPages, safePage } = paginateRecords(displayedRecords, state.pageSize, state.currentPage);
  state.currentPage = safePage;
  const activeFilterCount = (state.sizeFilter.size > 0 ? 1 : 0) + (state.shapedOnly ? 1 : 0);

  shelfRoot.innerHTML = `
    <div>
      <div class="controls">
        <h2 class="recordCount">${state.records.length} ${state.records.length === 1 ? "record" : "records"}</h2>
        ${renderSortSelect()}
        <button type="button" class="sortDirBtn" data-sort-direction aria-label="${state.sortAsc ? "Sort ascending" : "Sort descending"}">${state.sortAsc ? "▲" : "▼"}</button>
        ${renderFilterControls(activeFilterCount)}
        ${(activeFilterCount > 0 || state.activeBucket !== null) ? `<span class="filterResultCount">${displayedRecords.length} of ${state.records.length} shown</span>` : ""}
        ${renderPageSizeSelect()}
      </div>
      ${state.sortBy === "artist" && alphaBuckets.length > 0 ? renderAlphaNav(alphaBuckets) : ""}
      <div class="grid">
        ${pageRecords.map(renderRecordCard).join("")}
      </div>
      ${totalPages > 1 ? renderPagination(totalPages, safePage) : ""}
    </div>
  `;

  wireShelfEvents();
}

function renderSortSelect(): string {
  return `
    <select class="sortSelect" data-sort-by aria-label="Sort by">
      <option value="artist" ${state.sortBy === "artist" ? "selected" : ""}>Artist</option>
      <option value="title" ${state.sortBy === "title" ? "selected" : ""}>Title</option>
      <option value="year" ${state.sortBy === "year" ? "selected" : ""}>Year</option>
    </select>
  `;
}

function renderPageSizeSelect(): string {
  return `
    <select class="sortSelect" data-page-size aria-label="Records per page">
      ${PAGE_SIZE_OPTIONS.map((pageSize) => `<option value="${pageSize}" ${state.pageSize === pageSize ? "selected" : ""}>${pageSize} per page</option>`).join("")}
    </select>
  `;
}

function renderFilterControls(activeFilterCount: number): string {
  const sizes = uniqueEffectiveSizes(state.records);
  return `
    <div class="filterWrapper">
      <button type="button" class="filterBtn${activeFilterCount > 0 ? " active" : ""}" data-filter-toggle aria-label="Filter records" aria-expanded="${state.showFilters}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>
        ${activeFilterCount > 0 ? `<span class="filterBadge">${activeFilterCount}</span>` : ""}
      </button>
      ${state.showFilters ? `
        <div class="filterDropdown" role="group" aria-label="Filters">
          <div class="filterGroupLabel">Size</div>
          ${sizes.map((size) => `
            <label class="filterCheckLabel">
              <input type="checkbox" data-size-filter="${escapeHtml(size)}" ${state.sizeFilter.has(size) ? "checked" : ""} />
              ${escapeHtml(size)}
            </label>
          `).join("")}
          <div class="filterDivider"></div>
          <label class="filterCheckLabel">
            <input type="checkbox" data-shaped-filter ${state.shapedOnly ? "checked" : ""} />
            Picture disc / Shaped only
          </label>
          ${activeFilterCount > 0 ? `<button type="button" class="filterClearBtn" data-clear-filters>Clear filters</button>` : ""}
        </div>
      ` : ""}
    </div>
  `;
}

function renderAlphaNav(alphaBuckets: ReturnType<typeof computeBuckets>): string {
  return `
    <nav class="alphaNav" aria-label="Alphabetical filter">
      <button type="button" class="alphaBtn ${state.activeBucket === null ? "active" : ""}" data-alpha-bucket="" aria-pressed="${state.activeBucket === null}">All</button>
      ${alphaBuckets.map((bucket) => `
        <button type="button" class="alphaBtn ${state.activeBucket === bucket.label ? "active" : ""}" data-alpha-bucket="${escapeHtml(bucket.label)}" aria-pressed="${state.activeBucket === bucket.label}" title="${bucket.recordIds.length} record${bucket.recordIds.length === 1 ? "" : "s"}">${escapeHtml(bucket.label)}</button>
      `).join("")}
    </nav>
  `;
}

function renderPagination(totalPages: number, safePage: number): string {
  return `
    <div class="pagination">
      <button type="button" class="pageBtn" data-page-prev ${safePage === 1 ? "disabled" : ""} aria-label="Previous page">‹</button>
      <span class="pageInfo">${safePage} / ${totalPages}</span>
      <button type="button" class="pageBtn" data-page-next ${safePage === totalPages ? "disabled" : ""} aria-label="Next page">›</button>
    </div>
  `;
}

function renderImage(record: BrowserRecord, sizeClass: string, width: number, height: number): string {
  if (!record.thumbnailUrl) return `<div class="noImagePlaceholder">No Image</div>`;
  return `<img src="${escapeHtml(record.thumbnailUrl)}" alt="${escapeHtml(`${record.albumTitle} by ${record.artistName}`)}" width="${width}" height="${height}" class="${sizeClass}" />`;
}

function renderMetaRow(label: string, value: unknown, className = "metaValue"): string {
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return "";
  const displayValue = Array.isArray(value) ? value.join(", ") : value;
  return `
    <div class="metaRow">
      <span class="metaLabel">${escapeHtml(label)}:</span>
      <span class="${className}">${escapeHtml(displayValue)}</span>
    </div>
  `;
}

function renderRecordCard(record: BrowserRecord): string {
  return `
    <div class="flip-card" data-record-card data-record-id="${escapeHtml(record.recordId)}" role="button" tabindex="0" aria-expanded="false" aria-label="${escapeHtml(`${record.albumTitle} by ${record.artistName}`)}">
      <div class="flip-card-inner">
        <div class="flip-card-front">
          <div class="cardFrontContent">
            <div class="album-art-size albumArtWrapper">${renderImage(record, "", 144, 144)}</div>
            <h3 class="albumTitle">${escapeHtml(record.albumTitle)}</h3>
            <p class="albumArtist">${escapeHtml(record.artistName)}</p>
          </div>
        </div>
        <div class="flip-card-back">
          <div class="cardBack">
            <div class="album-art-size-lg albumArtWrapperLg">${renderImage(record, "", 216, 216)}</div>
            <div>
              <h3 class="metaTitle">${escapeHtml(record.albumTitle)}</h3>
              <p class="metaArtist">${escapeHtml(record.artistName)}</p>
              <div class="metaSection">
                ${renderMetaRow("Year", record.yearReleased, "metaValueMono")}
                ${renderMetaRow("Size", record.recordSize)}
                ${renderMetaRow("Color", record.vinylColor)}
                ${record.isShapedVinyl ? renderMetaRow("Type", "Shaped/Picture Disc") : ""}
                ${renderMetaRow("Label", record.labelName)}
                ${renderMetaRow("Cat#", record.catalogNumber, "metaValueMono")}
                ${renderMetaRow("UPC", record.upcCode)}
                ${renderMetaRow("Genres", record.genres)}
                ${renderMetaRow("Styles", record.styles)}
                ${renderMetaRow("Source", record.dataSource)}
                ${renderMetaRow("Discogs ID", record.discogsId, "metaValueMono")}
                ${record.discogsUri ? `<div class="metaRow"><span class="metaLabel">Discogs:</span> <a href="${escapeHtml(record.discogsUri)}" target="_blank" rel="noopener noreferrer" class="metaLink" data-stop-card-click>View on Discogs</a></div>` : ""}
                ${record.isSyncedWithDiscogs ? `<div class="metaRow"><span class="metaLabel">Synced:</span> <span class="metaValueAccent">✓</span></div>` : ""}
              </div>
            </div>
            <div class="actions">
              <button type="button" class="btnUpdate" data-update-record>Update</button>
              <button type="button" class="btnDelete" data-delete-request>Delete</button>
              <div class="confirmDelete" data-confirm-delete hidden>
                <span class="confirmDeleteText">Are you sure?</span>
                <button type="button" class="btnConfirmYes" data-delete-confirm>Yes</button>
                <button type="button" class="btnConfirmNo" data-delete-cancel>No</button>
              </div>
              <div class="actionError" data-action-error hidden></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function wireShelfEvents(): void {
  query<HTMLSelectElement>("[data-sort-by]").addEventListener("change", (event) => {
    state.sortBy = (event.target as HTMLSelectElement).value as SortBy;
    state.activeBucket = null;
    state.currentPage = 1;
    renderShelf();
  });

  query<HTMLButtonElement>("[data-sort-direction]").addEventListener("click", () => {
    state.sortAsc = !state.sortAsc;
    state.currentPage = 1;
    renderShelf();
  });

  query<HTMLSelectElement>("[data-page-size]").addEventListener("change", (event) => {
    state.pageSize = Number((event.target as HTMLSelectElement).value) as PageSize;
    state.currentPage = 1;
    renderShelf();
  });

  document.querySelector<HTMLElement>("[data-filter-toggle]")?.addEventListener("click", () => {
    state.showFilters = !state.showFilters;
    renderShelf();
  });

  document.querySelectorAll<HTMLInputElement>("[data-size-filter]").forEach((input) => {
    input.addEventListener("change", () => {
      const size = input.dataset.sizeFilter || "";
      if (input.checked) state.sizeFilter.add(size);
      else state.sizeFilter.delete(size);
      state.currentPage = 1;
      renderShelf();
    });
  });

  document.querySelector<HTMLInputElement>("[data-shaped-filter]")?.addEventListener("change", (event) => {
    state.shapedOnly = (event.target as HTMLInputElement).checked;
    state.currentPage = 1;
    renderShelf();
  });

  document.querySelector<HTMLButtonElement>("[data-clear-filters]")?.addEventListener("click", () => {
    state.sizeFilter.clear();
    state.shapedOnly = false;
    state.currentPage = 1;
    renderShelf();
  });

  document.querySelectorAll<HTMLButtonElement>("[data-alpha-bucket]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeBucket = button.dataset.alphaBucket || null;
      state.currentPage = 1;
      renderShelf();
    });
  });

  document.querySelector<HTMLButtonElement>("[data-page-prev]")?.addEventListener("click", () => {
    state.currentPage = Math.max(1, state.currentPage - 1);
    renderShelf();
  });

  document.querySelector<HTMLButtonElement>("[data-page-next]")?.addEventListener("click", () => {
    state.currentPage += 1;
    renderShelf();
  });

  document.querySelectorAll<HTMLElement>("[data-record-card]").forEach(wireCardEvents);
}

function wireCardEvents(card: HTMLElement): void {
  const record = state.records.find((item) => item.recordId === card.dataset.recordId);
  if (!record) return;

  const flip = () => {
    const isFlipped = card.classList.toggle("flipped");
    card.setAttribute("aria-expanded", String(isFlipped));
    adjustCardMargins(card, isFlipped);
  };

  card.addEventListener("click", flip);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      flip();
    }
  });

  card.querySelectorAll<HTMLElement>("button, a, [data-stop-card-click]").forEach((element) => {
    element.addEventListener("click", (event) => event.stopPropagation());
  });

  card.querySelector<HTMLButtonElement>("[data-update-record]")?.addEventListener("click", () => updateRecord(record, card));
  card.querySelector<HTMLButtonElement>("[data-delete-request]")?.addEventListener("click", () => {
    show(card.querySelector<HTMLElement>("[data-confirm-delete]")!, true);
    clearCardError(card);
  });
  card.querySelector<HTMLButtonElement>("[data-delete-cancel]")?.addEventListener("click", () => {
    show(card.querySelector<HTMLElement>("[data-confirm-delete]")!, false);
  });
  card.querySelector<HTMLButtonElement>("[data-delete-confirm]")?.addEventListener("click", () => deleteRecord(record, card));
}

function adjustCardMargins(card: HTMLElement, isFlipped: boolean): void {
  if (!isFlipped) {
    card.style.marginLeft = "";
    card.style.marginRight = "";
    return;
  }

  const rect = card.getBoundingClientRect();
  const extra = 70;
  const half = extra / 2;
  let marginLeft = -half;
  let marginRight = -half;
  const spaceRight = window.innerWidth - rect.right;
  if (spaceRight < half) {
    const shift = half - spaceRight;
    marginLeft -= shift;
    marginRight += shift;
  }
  const spaceLeft = rect.left;
  if (spaceLeft < Math.abs(marginLeft)) {
    const shift = Math.abs(marginLeft) - spaceLeft;
    marginLeft += shift;
    marginRight -= shift;
  }
  card.style.marginLeft = `${marginLeft}px`;
  card.style.marginRight = `${marginRight}px`;
}

function clearCardError(card: HTMLElement): void {
  const errorElement = card.querySelector<HTMLElement>("[data-action-error]");
  if (!errorElement) return;
  errorElement.textContent = "";
  errorElement.hidden = true;
}

function showCardError(card: HTMLElement, message: string): void {
  const errorElement = card.querySelector<HTMLElement>("[data-action-error]");
  if (!errorElement) return;
  errorElement.textContent = message;
  errorElement.hidden = false;
}

async function updateRecord(record: BrowserRecord, card: HTMLElement): Promise<void> {
  clearCardError(card);
  if (!record.discogsId) {
    showCardError(card, "This record has no Discogs ID and cannot be updated.");
    return;
  }

  try {
    await fetchJson("/api/records/update-from-discogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId: record.recordId, discogsId: record.discogsId }),
    });
    await loadRecords();
  } catch {
    showCardError(card, "Failed to update record from Discogs. Please try again.");
  }
}

async function deleteRecord(record: BrowserRecord, card: HTMLElement): Promise<void> {
  show(card.querySelector<HTMLElement>("[data-confirm-delete]")!, false);
  try {
    await fetchJson(`/api/records/${encodeURIComponent(record.recordId)}`, { method: "DELETE" });
    await loadRecords();
  } catch {
    showCardError(card, "Failed to delete record. Please try again.");
  }
}

function setSearchMethod(method: SearchMethod): void {
  state.searchMethod = method;
  document.querySelectorAll<HTMLButtonElement>("[data-search-method]").forEach((button) => {
    button.classList.toggle("active", button.dataset.searchMethod === method);
  });
  show(query<HTMLElement>("[data-field-artist]"), method === "artistTitle");
  show(query<HTMLElement>("[data-field-title]"), method === "artistTitle");
  show(query<HTMLElement>("[data-field-catalog]"), method === "catalog");
  show(query<HTMLElement>("[data-field-upc]"), method === "upc");
}

function buildSearchUrl(): string | null {
  if (state.searchMethod === "catalog") {
    const catalogNumber = query<HTMLInputElement>("[data-catalog-number]").value.trim();
    return catalogNumber ? `/api/records/search?catalogNumber=${encodeURIComponent(catalogNumber)}` : null;
  }
  if (state.searchMethod === "upc") {
    const upcCode = query<HTMLInputElement>("[data-upc-code]").value.trim();
    return upcCode ? `/api/records/search?upc=${encodeURIComponent(upcCode)}` : null;
  }
  const artistName = query<HTMLInputElement>("[data-artist-name]").value.trim();
  const albumTitle = query<HTMLInputElement>("[data-album-title]").value.trim();
  return artistName && albumTitle
    ? `/api/records/search?artist=${encodeURIComponent(artistName)}&title=${encodeURIComponent(albumTitle)}`
    : null;
}

async function handleSearchSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  clearMessage("[data-search-error]");
  clearMessage("[data-search-success]");
  show(query<HTMLElement>("[data-search-results]"), false);

  const searchUrl = buildSearchUrl();
  if (!searchUrl) {
    showMessage("[data-search-error]", "Please fill in all required fields");
    return;
  }

  const button = query<HTMLButtonElement>("[data-search-button]");
  button.disabled = true;
  button.innerHTML = `<div class="searchBtnSpinner"></div>`;

  try {
    const data = await fetchJson<{ results: DiscogsSearchResult[] }>(searchUrl);
    renderSearchResults(data.results || []);
    if ((data.results || []).length === 0) {
      showMessage("[data-search-error]", "No results found. Try a different search or add manually.");
    }
  } catch (error) {
    showMessage("[data-search-error]", error instanceof Error ? error.message : "An error occurred while searching");
  } finally {
    button.disabled = false;
    button.innerHTML = `<img src="/discogs-logo.svg" alt="Search Discogs" width="32" height="32" class="discogsLogo" />`;
  }
}

function renderSearchResults(results: DiscogsSearchResult[]): void {
  const container = query<HTMLElement>("[data-search-results]");
  if (results.length === 0) {
    container.innerHTML = "";
    container.hidden = true;
    return;
  }

  container.innerHTML = `
    <h3 class="resultsHeading">Results (${results.length})</h3>
    <div class="resultsList">
      ${results.map((result) => `
        <div class="resultItem">
          ${result.thumb ? `<img src="${escapeHtml(result.thumb)}" alt="${escapeHtml(result.title)}" width="48" height="48" class="resultThumb" />` : ""}
          <div class="resultInfo">
            <h4 class="resultTitle">${escapeHtml(result.title)}</h4>
            <div class="resultMeta">
              ${result.year ? `<span>${escapeHtml(result.year)}</span>` : ""}
              ${result.catno ? `<span>Cat#: ${escapeHtml(result.catno)}</span>` : ""}
              ${result.recordSize ? `<span>${escapeHtml(result.recordSize)}</span>` : ""}
              ${result.vinylColor ? `<span>${escapeHtml(result.vinylColor)}</span>` : ""}
              ${result.isShapedVinyl ? `<span class="resultPicDisc">Picture Disc</span>` : ""}
            </div>
          </div>
          <button type="button" class="addBtn" data-add-result="${result.id}">+ Add</button>
        </div>
      `).join("")}
    </div>
  `;
  container.hidden = false;

  container.querySelectorAll<HTMLButtonElement>("[data-add-result]").forEach((button) => {
    button.addEventListener("click", () => addSearchResult(Number(button.dataset.addResult)));
  });
}

async function addSearchResult(releaseId: number): Promise<void> {
  clearMessage("[data-search-error]");
  try {
    const data = await fetchJson<{ record?: BrowserRecord }>("/api/records/fetch-from-discogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseId }),
    });
    showMessage("[data-search-success]", `Added "${data.record?.albumTitle ?? "record"}" to collection!`);
    window.setTimeout(() => clearMessage("[data-search-success]"), 3000);
    await loadRecords();
  } catch (error) {
    showMessage("[data-search-error]", error instanceof Error ? error.message : "Failed to add record. Please try manual entry.");
  }
}

function renderSyncProgress(progress: SyncProgress): void {
  const bar = query<HTMLElement>("[data-sync-bar]");
  const track = query<HTMLElement>("[data-sync-progress-track]");
  const fill = query<HTMLElement>("[data-sync-progress-fill]");
  const status = query<HTMLElement>("[data-sync-status]");

  if (progress.phase === "done") {
    show(bar, false);
  } else {
    show(bar, true);
    status.innerHTML = `
      <span class="syncPhase">${progress.phase === "pull" ? "Pulling from Discogs..." : "Pushing to Discogs..."}</span>
      <span>Imported: ${progress.pulled}</span>
      <span>Pushed: ${progress.pushed}</span>
      <span>Skipped: ${progress.skipped}</span>
      ${progress.totalDiscogsItems > 0 ? `<span>(${progress.pulled + progress.skipped} / ${progress.totalDiscogsItems})</span>` : ""}
    `;
    show(track, progress.totalDiscogsItems > 0);
    if (progress.totalDiscogsItems > 0) {
      fill.style.width = `${Math.round(((progress.pulled + progress.skipped) / progress.totalDiscogsItems) * 100)}%`;
    }
  }

  if (progress.errors.length > 0) {
    const errors = progress.errors.slice(0, 5).map((error) => `<div>${escapeHtml(error)}</div>`).join("");
    const remainder = progress.errors.length > 5 ? `<div>...and ${progress.errors.length - 5} more errors</div>` : "";
    setHtml("[data-sync-errors-content]", errors + remainder);
    show(query<HTMLElement>("[data-sync-errors]"), true);
  }
}

async function handleSync(): Promise<void> {
  const button = query<HTMLButtonElement>("[data-sync-button]");
  button.disabled = true;
  button.textContent = "Syncing...";
  show(query<HTMLElement>("[data-sync-errors]"), false);

  try {
    const response = await fetch("/api/records/sync", { method: "POST" });
    if (!response.body) throw new Error("No response stream");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseChunk(buffer);
      buffer = parsed.remainder;
      for (const event of parsed.events) renderSyncProgress(event as SyncProgress);
    }

    if (buffer.trim()) {
      const parsed = JSON.parse(buffer.replace(/^data: /, "")) as SyncProgress;
      renderSyncProgress(parsed);
    }
    await loadRecords();
  } catch (error) {
    renderSyncProgress({
      phase: "done",
      pulled: 0,
      pushed: 0,
      skipped: 0,
      errors: [error instanceof Error ? error.message : "Sync failed"],
      totalDiscogsItems: 0,
    });
  } finally {
    button.disabled = false;
    button.textContent = "Sync Collection";
  }
}

function wireStaticEvents(): void {
  query<HTMLButtonElement>("[data-toggle-search]").addEventListener("click", () => {
    const section = query<HTMLElement>("[data-search-section]");
    const button = query<HTMLButtonElement>("[data-toggle-search]");
    section.hidden = !section.hidden;
    button.textContent = section.hidden ? "+ Add an album" : "Close";
  });

  query<HTMLButtonElement>("[data-sync-button]").addEventListener("click", handleSync);
  query<HTMLFormElement>("[data-search-form]").addEventListener("submit", handleSearchSubmit);

  document.querySelectorAll<HTMLButtonElement>("[data-search-method]").forEach((button) => {
    button.addEventListener("click", () => setSearchMethod(button.dataset.searchMethod as SearchMethod));
  });
}

wireStaticEvents();
setSearchMethod("artistTitle");
void checkSyncStatus();
void loadRecords();
