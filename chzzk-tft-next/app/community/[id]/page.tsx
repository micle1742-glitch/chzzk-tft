import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../components/SiteNav";
import { MOCK_POSTS } from "../mock-data";
import "../community.css";

// 게시글 상세 (UI만). 데이터는 mock-data.ts의 목업, 댓글 작성은 없다.
export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = MOCK_POSTS.find((p) => String(p.id) === id);
  if (!post) notFound();

  return (
    <div className="cm-page">
      <SiteNav />

      <main className="cm-wrap cm-wrap-narrow">
        <Link href="/community" className="cm-back">
          ← 목록으로
        </Link>

        <article className="cm-panel cm-article">
          <span className={`cm-badge ${post.category === "공지" ? "is-notice" : ""}`}>{post.category}</span>
          <h1 className="cm-article-title">{post.title}</h1>
          <div className="cm-article-meta">
            <span>{post.author}</span>
            <span>{post.date}</span>
            <span>댓글 {post.comments}</span>
          </div>
          <div className="cm-article-body">{post.body}</div>
        </article>

        <section className="cm-panel" aria-label="댓글">
          <h2 className="cm-h2">댓글 {post.comments}</h2>
          <p className="cm-notice">
            <span className="cm-notice-dot" aria-hidden="true" />
            <span>
              이 글은 <strong>예시 데이터</strong>이며, 댓글 기능은 준비 중입니다.
            </span>
          </p>
          <div className="cm-comment-form">
            <textarea className="cm-textarea" placeholder="댓글 기능은 준비 중입니다" disabled />
            <button type="button" className="cm-write" disabled>
              등록
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
