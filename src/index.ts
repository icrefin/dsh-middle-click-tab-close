/**
 * dsh-middle-click-tab-close — host half.
 *
 * The gesture is entirely a page-side behaviour: it resolves a right-sidebar
 * tab chip in the DOM and calls the client's own navigation controller. Nothing
 * runs in the host process, so this half only supplies the Loader row's plugin
 * identity.
 *
 * It exists because a dsh bundle is a package plus a Loader row, and the row
 * mounts `exports["."]`. {@link apply} is intentionally empty; the browser half
 * (`exports["./client"]`) carries the behaviour.
 *
 * @module dsh-middle-click-tab-close
 */

/** Loader row id; mirrors `cordis.patch.yml` and the package name. */
export const name = 'dsh-middle-click-tab-close'

/** Inert host half: the browser half installs the gesture. */
export function apply(): void {}