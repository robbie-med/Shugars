# Glucose & Mortality · Risk Explorer

An interactive, static web app that lets users explore **Yi et al. 2017** (*Association between fasting glucose and all-cause mortality according to sex and age: prospective cohort study* — Scientific Reports 7, 8194) and plot their own fasting glucose on the J-shaped mortality curve.

> 🩸 **Live demo:** enable GitHub Pages on this repo and visit `https://<your-user>.github.io/<repo>/`

## Features

- **Explore the paper** — key findings, methodology, and an interactive reference J-curve you can slice by age and sex.
- **Your risk** — enter fasting glucose, age, and biological sex; see your category, hazard ratio, and personalized J-curve.
- **How to improve** — recommendations adapt to your current zone (hypoglycemia, optimal, prediabetes, diabetes).
- **Light + dark themes** — medical-grade aesthetic in both.
- **English + Korean** (한국어) — full UI translation; the cohort is Korean, so this matters.
- **Privacy-preserving** — pure client-side; no analytics, no backend, no data leaves your browser.
- **Zero build step** — vanilla HTML/CSS/JS. Deploy by pushing to `main`.

## Deploying to GitHub Pages

1. Push these files to the root of a public repository.
2. Repo → Settings → Pages → Source: `Deploy from a branch`, Branch: `main` / `(root)`.
3. Visit `https://<user>.github.io/<repo>/`.

That's it. No build, no CI, no dependencies.

## File layout

```
index.html      — page structure + content
styles.css      — themes (light/dark) and layout
i18n.js         — all UI strings (EN + KO)
app.js          — HR computation, charts (inline SVG), event wiring
```

## Data source

Hazard ratios are from **Table 2** of Yi et al. (2017). The hypoglycemia (left-arm) values are approximated from **Figure 2** of the paper, since Table 2 does not stratify HRs below 80 mg/dL.

- Paper: https://www.nature.com/articles/s41598-017-08498-6
- DOI: https://doi.org/10.1038/s41598-017-08498-6

## Disclaimer

This is an **educational tool**. It visualizes population-level hazard ratios from an observational cohort and is **not** medical advice, diagnosis, or treatment. Always consult a licensed clinician for any health decision.
