import type { PersonalGuidanceLink } from "@/domain/exercises/personal-guidance";

export function PersonalGuidancePanel({
  links,
}: Readonly<{ links: readonly PersonalGuidanceLink[] }>) {
  return (
    <div className="runner-personal-guidance">
      <ul aria-label="Your personal guidance links">
        {links.map((link, index) => (
          <li key={`${link.kind}:${link.canonicalUrl}`}>
            <span className="runner-eyebrow">Your link {index + 1}</span>
            {link.kind === "youtube" ? (
              <div className="runner-personal-guidance__player">
                <iframe
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                  src={link.embedUrl}
                  title={`Your movement guidance video ${index + 1}`}
                />
              </div>
            ) : (
              <a
                href={link.canonicalUrl}
                referrerPolicy="no-referrer"
                rel="noreferrer noopener"
                target="_blank"
              >
                Open your link {index + 1}
              </a>
            )}
          </li>
        ))}
      </ul>
      <p className="runner-muted">
        Personal links are yours and have not been reviewed or approved by the app.
      </p>
    </div>
  );
}
