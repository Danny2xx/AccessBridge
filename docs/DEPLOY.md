# Deploying AccessBridge AI

There are two ways to put the site in front of people. The static one needs no
server and is the recommended route for a portfolio demo.

## 1. Static site on GitHub Pages (recommended)

Every request the Explore controls can make is precomputed into JSON, so the
whole site runs from static files. The snapshot lives in `frontend/public/api`
and is committed with the code.

One-off setup, from the project root:

```bash
# 1. Refresh the snapshot whenever the data or optimiser changes
.venv/bin/python scripts/export_static_api.py

# 2. Check it works locally with no API running
cd frontend && npm run preview:static      # open http://127.0.0.1:4173/

# 3. Create an empty GitHub repository, then push
git remote add origin git@github.com:<your-user>/<repo>.git
git push -u origin main
```

The `Deploy to GitHub Pages` workflow builds the site with
`VITE_STATIC_API=true` and the repository name as the base path, and pushes
the result to a `gh-pages` branch on every push to `main`. GitHub Pages serves
that branch at `https://<your-user>.github.io/<repo>/`. If the site does not
appear after the first run, open the repository settings, choose **Pages**, and
set the source to the `gh-pages` branch. The `CI` workflow runs the backend
tests, the linters and the frontend build.

The live site for this repository is
<https://danny2xx.github.io/AccessBridge/>.

The static build serves the default plan and every slider combination. It has
the same story, evidence and explore pages as the live site.

## 2. Live API and site in one container

For a live API, for example if you later add settings that are not on the
sliders, build the container. It bundles the FastAPI app, the processed data
and the built site, and serves everything on port 8000.

```bash
docker compose up --build            # http://127.0.0.1:8000/
```

Any host that runs a container image works: Fly.io, Render, Railway, Google
Cloud Run or a plain VM. Point it at port 8000. The image is self-contained, so
no volumes or environment variables are needed.

## What each deployment includes

| | Static (Pages) | Container |
|---|---|---|
| Story, Explore, Evidence, How it works, The Ask | yes | yes |
| Every slider combination | precomputed | live |
| Arbitrary API requests | no | yes |
| Needs a server | no | yes |
| Cost | free | host-dependent |

## Refreshing the data

The routed travel-time matrix is built by `scripts/build_r5_matrix.py` under
the separate routing environment (see the README). After rebuilding it, rerun
the Stage 7 builder, the evaluation and the static export, and commit the
updated snapshot.
