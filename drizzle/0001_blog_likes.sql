CREATE TABLE IF NOT EXISTS "blog_likes" (
	"post_slug" varchar(200) NOT NULL,
	"visitor_hash" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_likes_post_slug_visitor_hash_pk" PRIMARY KEY("post_slug","visitor_hash")
);
