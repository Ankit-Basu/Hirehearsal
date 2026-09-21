/**
 * Templates re-mount on every navigation, which gives each route a soft entrance. The animation is
 * pure CSS, so a page can never be left invisible by a stalled JavaScript animation.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
