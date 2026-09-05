import { CuratedVideoPlayer } from "@/components/video/curated-video-player";
import type { CuratedVideos } from "@/domain/youtube/embed";

export function ExerciseVideoField({videos}: Readonly<{videos: CuratedVideos | undefined}>) {
  return <section className="video-field" aria-labelledby="demo-heading">
    <h2 id="demo-heading">Demonstration</h2>
    {videos ? <CuratedVideoPlayer videos={videos} /> : <p>No demonstration is available. Follow the written cues; workout logging remains available.</p>}
  </section>;
}
