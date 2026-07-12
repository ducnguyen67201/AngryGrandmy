import Image from "next/image";

import { getGrannyArrivalScenes } from "@/lib/ui/granny-arrival";

export function GrannyArrival() {
  const scenes = getGrannyArrivalScenes();

  return (
    <section
      aria-label="GrannySmith is finding Linda and preparing her usability test"
      aria-live="polite"
      className="granny-arrival"
      role="status"
    >
      <div className="granny-arrival-stage">
        {scenes.map((scene) => (
          <figure className={`granny-arrival-scene is-${scene.id}`} key={scene.id}>
            <Image
              alt=""
              aria-hidden="true"
              fill
              priority
              sizes="100vw"
              src={scene.imageSrc}
            />
          </figure>
        ))}

        <div className="granny-arrival-vignette" aria-hidden="true" />
        <div className="granny-arrival-copy">
          <Image
            alt=""
            aria-hidden="true"
            className="granny-arrival-avatar"
            height={64}
            src="/grandma-linda-2d.png"
            width={64}
          />
          <div>
            <small>GrannySmith field trip</small>
            <strong>
              {scenes.map((scene) => (
                <span className={`is-${scene.id}`} key={scene.id}>{scene.label}</span>
              ))}
            </strong>
            <p>Map → home → testing room → real product feedback</p>
          </div>
        </div>

        <div className="granny-arrival-progress" aria-hidden="true">
          <i /><i /><i /><i />
        </div>
      </div>
    </section>
  );
}
