// /live-showcase — thin page-chrome wrapper around <PipelineDemo/>. All demo
// logic (player, canvas bridge, HUD, theme, end-reset, phone wiring) lives in
// ./pipeline/PipelineDemo.tsx; this file only owns the route-level shell.
import { PipelineDemo } from './pipeline/PipelineDemo';

export function ShowcaseLivePage() {
  return <PipelineDemo mode="full" />;
}

export default ShowcaseLivePage;
