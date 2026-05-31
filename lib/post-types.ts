// Shared post types — client-safe (no imports, no server code).
// One post model for the merged dashboard + community feed.

export type PostKind = "post" | "milestone" | "show_and_tell";

export type PostAuthor = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  slug: string | null;
};

export type PostItem = {
  id: string;
  title: string | null;
  content: string;
  kind: PostKind;
  link_url: string | null;
  image_url: string | null;
  tags: string[];
  created_at: string;
  author: PostAuthor | null;
  isOwn: boolean;
  likeCount: number;
  myLike: boolean;
  commentCount: number;
};

export type PostComment = {
  id: string;
  content: string;
  created_at: string;
  author: PostAuthor | null;
  isOwn: boolean;
};
