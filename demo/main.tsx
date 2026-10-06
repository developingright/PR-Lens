import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  GitPullRequest,
  Images,
  MessageSquare,
  Plus,
} from 'lucide-react';
import { GalleryStore } from '../src/gallery/model';
import { createThemeStore } from '../src/theme/store';
import { Viewer } from '../src/viewer/Viewer';
import viewerCss from '../src/viewer/viewer.css?inline';
import { fixtureImages, type Dataset } from './fixtures';
import './page.css';

const gallery = new GalleryStore();
const theme = createThemeStore(document, {
  load: async () => localStorage.getItem('pr-lens-theme'),
  save: async (value) => {
    localStorage.setItem('pr-lens-theme', value);
  },
});
gallery.update(fixtureImages('demo'));
const host = document.createElement('pr-lens');
const shadow = host.attachShadow({ mode: 'open' });
const style = document.createElement('style');
style.textContent = viewerCss;
const root = document.createElement('div');
const portal = document.createElement('div');
shadow.append(style, root, portal);
document.body.append(host);
createRoot(root).render(
  <Viewer gallery={gallery} theme={theme} portalContainer={portal} onRetry={() => {}} />,
);

function Demo() {
  const [dataset, setDataset] = useState<Dataset>('demo');
  const items = fixtureImages(dataset);
  const open = (id: string, button: HTMLElement) => gallery.show(id, button);
  return (
    <>
      <div className="preview-banner">
        <a href="/" className="preview-brand">
          <Images size={18} /> PR Lens <span>interactive preview</span>
        </a>
        <span className="preview-note">A closer look. Fewer tabs.</span>
        <button
          disabled={!items.length}
          onClick={(event) => open(items[0]!.id, event.currentTarget)}
        >
          Open viewer <ArrowUpRight size={14} />
        </button>
      </div>
      <nav className="github-nav" aria-label="Repository">
        <div className="github-mark">◉</div>
        <span>
          northstar <span className="nav-slash">/</span> <b>workspace</b>
        </span>
        <div className="github-nav-end">
          <span>⌘ K</span>
          <span className="avatar avatar-you">S</span>
        </div>
      </nav>
      <div className="repo-tabs">
        <span>Code</span>
        <span>
          Issues <small>12</small>
        </span>
        <span className="repo-tab-active">
          <GitPullRequest size={14} /> Pull requests <small>4</small>
        </span>
        <span>Actions</span>
        <span>Projects</span>
      </div>
      <main className="pr-page">
        <div className="pr-eyebrow">
          PULL REQUEST <span>·</span> DESIGN SYSTEM
        </div>
        <div className="pr-title-row">
          <h1>
            A little more room to focus <span>#128</span>
          </h1>
          <button className="edit-button">Edit</button>
        </div>
        <div className="pr-meta">
          <span className="open-status">
            <GitPullRequest size={15} /> Open
          </span>
          <span>
            <b>maya</b> wants to merge <b>3 commits</b> into <code>main</code> from{' '}
            <code>feat/workspace-refresh</code>
          </span>
        </div>
        <div className="conversation-tabs">
          <span className="active">
            <MessageSquare size={14} /> Conversation <small>6</small>
          </span>
          <span>
            Commits <small>3</small>
          </span>
          <span>
            Checks <small>2</small>
          </span>
          <span>
            Files changed <small>8</small>
          </span>
        </div>
        <div className="pr-columns">
          <section className="timeline" aria-label="PR conversation">
            <article className="comment" id="description">
              <span className="avatar author-avatar">M</span>
              <div className="comment-header">
                <b>maya</b>
                <span>commented 2 hours ago</span>
                <span className="author-tag">Author</span>
                <span>···</span>
              </div>
              <div className="comment-body">
                <h2>Less noise, more workspace.</h2>
                <p>
                  A small refresh of the workspace overview: calmer surfaces, clearer hierarchy, and
                  a little more breathing room around the things that matter.
                </p>
                <p>Here’s where we landed. Click a screenshot to take a closer look.</p>
                <div className="demo-screenshots">
                  {items.slice(0, 2).map((item) => (
                    <button
                      key={item.id}
                      className="screenshot-card"
                      onClick={(event) => open(item.id, event.currentTarget)}
                    >
                      <img src={item.src} alt={item.title} />
                      <span>
                        {item.title}
                        <ArrowUpRight size={13} />
                      </span>
                    </button>
                  ))}
                </div>
                <div className="checklist">
                  <span>
                    <Check size={14} /> Light and dark surfaces
                  </span>
                  <span>
                    <Check size={14} /> Keyboard navigation
                  </span>
                  <span>
                    <Check size={14} /> Notification preferences
                  </span>
                </div>
                <span className="reaction">
                  ✨ <span>3</span>
                </span>
              </div>
            </article>
            <div className="timeline-event">
              <span className="event-icon">
                <Check size={14} />
              </span>
              <span>
                <b>alex</b> approved these changes <span className="time">1 hour ago</span>
              </span>
            </div>
            <article className="comment" id="review">
              <span className="avatar author-avatar avatar-alex">A</span>
              <div className="comment-header">
                <b>alex</b>
                <span>commented 35 minutes ago</span>
                <span className="author-tag">Member</span>
                <span>···</span>
              </div>
              <div className="comment-body">
                <p>
                  The preferences panel feels much clearer now. Adding the final state here for
                  reference.
                </p>
                {items[2] && (
                  <button
                    className="screenshot-card review-screenshot"
                    onClick={(event) => open(items[2]!.id, event.currentTarget)}
                  >
                    <img src={items[2].src} alt={items[2].title} />
                    <span>
                      {items[2].title}
                      <ArrowUpRight size={13} />
                    </span>
                  </button>
                )}
              </div>
            </article>
          </section>
          <aside className="pr-sidebar">
            <div>
              <h3>Reviewers</h3>
              <span className="sidebar-user">
                <span className="avatar avatar-alex small-avatar">A</span> alex <Check size={14} />
              </span>
            </div>
            <div>
              <h3>
                Assignees <Plus size={13} />
              </h3>
              <span>No one assigned</span>
            </div>
            <div>
              <h3>Labels</h3>
              <span className="label-pill">design</span>
              <span className="label-pill label-green">enhancement</span>
            </div>
            <div>
              <h3>
                Projects <ChevronDown size={13} />
              </h3>
              <span>Workspace refresh</span>
            </div>
            <div className="demo-tip">
              <Images size={18} />
              <b>Every screenshot, one place.</b>
              <span>
                Click an image to browse the PR’s screenshots without leaving the conversation.
              </span>
            </div>
          </aside>
        </div>
      </main>
      <div className="fixture-switch" role="group" aria-label="Development fixtures">
        {(
          [
            { value: 'demo', label: 'Demo data' },
            { value: 'worst', label: 'Worst case' },
            { value: 'one', label: 'One' },
            { value: 'empty', label: 'Empty' },
            { value: 'many', label: '1,000 images' },
          ] as const
        ).map(({ value, label }) => (
          <button
            key={value}
            aria-pressed={dataset === value}
            onClick={() => {
              gallery.close();
              setDataset(value);
              gallery.update(fixtureImages(value));
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}

createRoot(document.getElementById('app')!).render(<Demo />);
