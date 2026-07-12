import Image from "next/image";
import { Check, Heart, Search, Sparkles } from "lucide-react";
import type { GrandmaFieldNote } from "@/lib/ui/grandma-field-notes";

type GrandmaFieldNotesProps = {
  notes: GrandmaFieldNote[];
  running: boolean;
};

const NOTE_ICONS = {
  complete: Check,
  feels: Heart,
  found: Search,
  thinking: Sparkles,
};

export function GrandmaFieldNotes({
  notes,
  running,
}: GrandmaFieldNotesProps) {
  return (
    <aside
      aria-label="Grandma's live field notes"
      className="grandma-field-notes"
    >
      <header>
        <Image
          alt=""
          aria-hidden="true"
          height={46}
          src="/grandma-linda-2d.png"
          width={46}
        />
        <div>
          <small>{running ? "Live from the visit" : "Visit recap"}</small>
          <h2>Grandma&apos;s field notes</h2>
        </div>
        <i className={running ? "is-live" : ""} />
      </header>

      <div aria-live="polite" className="grandma-note-stream" role="log">
        {notes.length ? (
          notes.map((note) => {
            const Icon = NOTE_ICONS[note.kind];
            return (
              <article className={`grandma-note is-${note.kind}`} key={note.id}>
                <span><Icon size={14} /></span>
                <div>
                  <b>{note.headline}</b>
                  <p>“{note.detail}”</p>
                  <small>
                    Step {note.step}
                    {note.severity ? ` · feeling ${note.severity}/5` : ""}
                  </small>
                </div>
              </article>
            );
          })
        ) : (
          <div className="grandma-notes-empty">
            <Sparkles size={18} />
            <b>Your grandmas are exploring…</b>
            <p>Their first thought or discovery will appear here automatically.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
