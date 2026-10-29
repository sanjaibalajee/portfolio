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

    // Some API responses come back with `entities` as an empty array instead
    // of the expected object, which makes react-tweet's enrichTweet spread an
    // undefined value ("c is not iterable") and crashes prerendering.
    const e = (result as any).entities;
    if (!e || Array.isArray(e)) {
      (result as any).entities = {
        hashtags: [],
        urls: [],
        user_mentions: [],
        symbols: [],
        media: [],
      };
    } else {
      e.hashtags ??= [];
      e.urls ??= [];
      e.user_mentions ??= [];
      e.symbols ??= [];
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
        <div className="react-tweet-theme max-w-lg">
          <ReactTweet id={id} />
        </div>
      </div>
      {caption && <Caption>{caption}</Caption>}
    </div>
  );
}
