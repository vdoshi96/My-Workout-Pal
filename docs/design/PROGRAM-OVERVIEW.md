# Program overview surface brief

## Scope and mode

The primary target is the public and authenticated program overview at `src/app/(app)/program/page.tsx`. The guest landing route can select this surface as its primary demonstration. Visitor mode is **Operate** inside the app and **Persuade through proof** on the public entry.

## Audience, job, and action

A guest needs to understand the five-day program, verify that their equipment works, and inspect a day before registering. An authenticated user needs to resume or open the active program. The primary action is **Open Push day** for the selected route waypoint; resume replaces it when a session is active.

## Chosen composition

The approved comp is `.impeccable/mocks/route-atlas-map.png`. Approval was delegated by the user through the end-to-end ownership brief. It was selected because the map makes equipment rerouting visible while the lower route sheet keeps the immediate operating task clear.

The first viewport contains a compact header, equipment profile control, dominant five-waypoint weekly route, selected-day prescription sheet, primary action, and app navigation. Only one route is visually dominant.

## Memorable moment

The equipment profile control reroutes only affected waypoints. The old path becomes a short dotted trace, the new path settles into place, and the text diff is available before any authenticated mutation.

## Responsive translation

- Phone keeps the map dominant and lets the selected-day sheet continue below the fold. Navigation remains thumb reachable.
- Tablet places a wider map beside the selected-day sheet when both remain legible.
- Desktop uses a bounded atlas spread with route and prescription panes. It does not enlarge the phone map into empty space.
- Reduced-motion mode swaps routes without drawing animation.

## Comp inventory

The implementation inventory follows the approved comp. Sampled colors are descriptive starting points and remain subject to contrast verification.

| Ingredient | Comp commitment | Implementation medium |
| --- | --- | --- |
| Page ground | Warm mineral field, sampled average near `#efeadf`, with restrained contour texture | CSS color plus authored SVG contour pattern |
| Navigation field | Deep blue-green field, sampled mixed average near `#27373d` | Semantic HTML and CSS |
| Equipment selector | Two large segmented options with lichen selected state | Form controls with CSS and icons from the project SVG system |
| Weekly route | Five numbered labeled waypoints connected by one coral route and one short dotted alternate | Responsive SVG with semantic list fallback |
| Selected-day sheet | Large ruled panel that overlaps the route field and previews prescriptions | Semantic section and ordered list with CSS |
| Primary action | Full-width coral route action with directional geometry | Semantic link or button with CSS and SVG mark |
| Bottom navigation | Four labeled destinations and clear current state | Semantic navigation with project SVG icons |
| Paper grain | Very light broad-field texture; never under inputs at a level that hurts contrast | Generated or authored raster only if CSS and SVG cannot match the approved material |
| Type | Condensed display silhouette for names and numerals; readable humanist body | Local or optimized web fonts selected after silhouette and performance comparison |
| Motion | One reroute draw and one saved-state stamp | CSS or SVG motion with immediate reduced-motion alternative |

## Nonliteral comp details

Do not copy generated mountain, tree, lake, shoe, compass, or exercise pictograms. Do not treat the generated weekday labels, sample duration, or summit badge as product facts. Core UI text, controls, focus behavior, semantics, and responsive structure are implemented from the product plans.

## Unresolved implementation checks

- Confirm that contour density survives light and dark mode without reducing contrast.
- Compare available condensed fonts against the comp before selecting one.
- Verify the route remains understandable at 320 CSS pixels and 200% zoom.
- Decide whether paper grain needs a raster after the first semantic CSS and SVG reproduction.
