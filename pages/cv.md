# Max Yankov

<p id="cv-generation-note" class="cv-generation-note" hidden></p>

<div id="cv-profile" class="cv-profile">{{cvProfile}}</div>

<p class="cv-export-actions" hidden><button type="button" id="cv-export">Download PDF</button> <span id="cv-pdf-status" role="status"></span></p>

<form class="cv-controls" aria-label="Highlight experience by topic" hidden>
  <fieldset>
    <legend>Highlight by topic <span class="cv-filter-hint">— choose several</span></legend>
    <div id="cv-tags" class="cv-tags">{{cvTags}}</div>
  </fieldset>
  <button type="button" id="cv-clear">Clear highlights</button>
</form>

<div class="cv-section-heading">
  <h2>Experience</h2>
  <p id="cv-status" role="status"></p>
</div>

<div id="cv-app" class="cv-app">{{cvWork}}</div>

<script type="application/json" id="cv-data">{{cvData}}</script>
<script type="module" src="{{cvScript}}"></script>
