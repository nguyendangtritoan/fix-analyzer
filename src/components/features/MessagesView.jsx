import React from 'react';
import SingleView from './SingleView';

const MessagesView = ({
  messages = [],
  tags,
  enums,
  groups,
  groupIndentEnabled = true,
  highlightedTags,
  onTagClick,
  highlightedValueTags,
  onValueClick,
}) => (
  <div className="overflow-x-auto pb-2">
    <div className="flex items-start gap-4">
      {messages.map(message => (
        <section key={message.id} className="min-w-full flex-1 space-y-2 lg:min-w-[32rem]" aria-labelledby={`result-${message.id}`}>
          <div className="flex items-center justify-between gap-3">
            <h3 id={`result-${message.id}`} className="text-sm font-bold text-slate-700">
              {message.label}
            </h3>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {message.data.length} {message.data.length === 1 ? 'tag' : 'tags'}
            </span>
          </div>
          <SingleView
            data={message.data}
            tags={tags}
            enums={enums}
            groups={groups}
            groupIndentEnabled={groupIndentEnabled}
            highlightedTags={highlightedTags}
            onTagClick={onTagClick}
            highlightedValueTags={highlightedValueTags}
            onValueClick={onValueClick}
          />
        </section>
      ))}
    </div>
  </div>
);

export default MessagesView;
