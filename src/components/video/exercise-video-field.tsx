import { CuratedVideoPlayer } from "@/components/video/curated-video-player";
import type { CuratedVideos } from "@/domain/youtube/embed";

export function ExerciseVideoField({videos}: Readonly<{videos: CuratedVideos | undefined}>) {
  return <section className="video-field pal-video" aria-labelledby="demo-heading">
    <h2 id="demo-heading">Demo</h2>
    {videos ? <CuratedVideoPlayer videos={videos} /> : <p className="pal-note">No demo yet. Follow the steps below.</p>}
  </section>;
}
