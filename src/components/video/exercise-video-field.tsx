import { CuratedVideoPlayer } from "@/components/video/curated-video-player";
import type { CuratedVideoPair } from "@/domain/youtube/embed";

export function ExerciseVideoField({
  videos,
}: Readonly<{ videos: CuratedVideoPair | undefined }>) {
  return (
    <section className="video-field" aria-labelledby="demo-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Two-source technique check</span>
          <h2 id="demo-heading">Curated demos</h2>
        </div>
        <span className="status-stamp">
          {videos ? "Approved pair" : "Unavailable"}
        </span>
      </div>
      {videos ? (
        <CuratedVideoPlayer videos={videos} />
      ) : (
        <>
          <div className="video-slots">
            {[1, 2].map((slot) => (
              <article className="video-unavailable" key={slot}>
                <span>Demo {slot}</span>
                <h3>Curated demos unavailable</h3>
                <p>No placeholder video is shown. Logging and the written route cues remain available.</p>
              </article>
            ))}
          </div>
          <p className="temporary-note">This exercise opens a player only when one exact approved pair is available.</p>
        </>
      )}
    </section>
  );
}
