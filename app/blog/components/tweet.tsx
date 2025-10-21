import { type ReactNode, Suspense } from "react";
import { Tweet as TweetType, getTweet } from "react-tweet/api";
import {
  EmbeddedTweet,
  TweetSkeleton,
  type TweetProps,
} from "react-tweet";
import { Caption } from "./caption";

interface TweetArgs {
  id: string;
  caption?: ReactNode;
}

const TweetContent = async ({ id, components }: TweetProps) => {
  if (!id) {
    return null;
  }

  let tweet: TweetType | undefined;

  try {
    const result = await getTweet(id);

    if (!result || (result as any)?.tombstone) {
      return null;
    }

    tweet = result;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Tweet ${id} not found or deleted`);
    }
    return null;
  }

  return <EmbeddedTweet tweet={tweet} components={components} />;
};

export const ReactTweet = (props: TweetProps) => (
  <Suspense fallback={<TweetSkeleton />}>
    <TweetContent {...props} />
  </Suspense>
);

export async function Tweet({ id, caption }: TweetArgs) {
  return (
    <div
      className="my-4 not-prose"
      style={{
        // @ts-expect-error: CSS custom properties are not typed
        '--tweet-container-margin': '0',
        '--tweet-font-family': 'inherit',
        '--tweet-font-color': 'inherit',
      }}
    >
      <div className="flex justify-center scale-90 -my-4">
        <div
          className="react-tweet-theme max-w-lg"
          style={{
            '--tweet-bg-color': '#fff',
            '--tweet-bg-color-hover': '#fff',
            '--tweet-color-blue-secondary': 'rgb(75, 85, 99)',
            '--tweet-color-blue-secondary-hover': 'rgb(243, 244, 246)',
            '--tweet-font-color-secondary': 'rgb(107, 114, 128)',
            '--tweet-quoted-bg-color-hover': 'rgba(0, 0, 0, 0.03)',
            '--tweet-border': '1px solid rgb(207, 217, 222)',
            '--tweet-skeleton-gradient': 'linear-gradient(270deg, #fafafa, #eaeaea, #eaeaea, #fafafa)',
            '--tweet-color-red-primary': 'rgb(249, 24, 128)',
            '--tweet-color-red-primary-hover': 'rgba(249, 24, 128, 0.1)',
            '--tweet-color-green-primary': 'rgb(0, 186, 124)',
            '--tweet-color-green-primary-hover': 'rgba(0, 186, 124, 0.1)',
            '--tweet-twitter-icon-color': 'var(--tweet-font-color)',
            '--tweet-verified-old-color': 'rgb(130, 154, 171)',
            '--tweet-verified-blue-color': 'var(--tweet-color-blue-primary)',
          } as React.CSSProperties}
        >
          <ReactTweet id={id} />
        </div>
      </div>
      {caption && <Caption>{caption}</Caption>}
    </div>
  );
}
