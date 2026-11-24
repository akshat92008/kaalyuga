'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Flame, Compass, ChevronRight, X, Sparkles } from 'lucide-react';
import {
  HubDialogueAction,
  HubDialogueNode,
  HubNpcId,
  getInitialDialogueNode,
  resolveDialogueChoice,
} from '@/lib/game/hubDialogues';
import { soundEngine } from '@/lib/game/audio';

interface HubDialogueModalProps {
  npcId: HubNpcId;
  onClose: () => void;
  onOpenForge: () => void;
  onEnterCharnelPlains: () => void;
}

export default function HubDialogueModal({
  npcId,
  onClose,
  onOpenForge,
  onEnterCharnelPlains,
}: HubDialogueModalProps) {
  const [node, setNode] = useState<HubDialogueNode>(() => getInitialDialogueNode(npcId));

  useEffect(() => {
    const initial = getInitialDialogueNode(npcId);
    setNode(initial);
    if (initial.voiceBarkKey) {
      soundEngine.playVoiceBark(initial.voiceBarkKey, { priority: 'high', cooldownMs: 800 });
    }
  }, [npcId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        soundEngine.playUiClick();
        onClose();
        return;
      }
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= node.choices.length) {
        e.preventDefault();
        handleChoice(node.choices[num - 1].id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node, onClose, onOpenForge, onEnterCharnelPlains]);

  const handleChoice = (choiceId: string) => {
    soundEngine.playUiClick();
    const res = resolveDialogueChoice(node, choiceId);
    const act: HubDialogueAction = res.action;
    if (act === 'next' && res.nextNode) {
      setNode(res.nextNode);
      if (res.nextNode.voiceBarkKey) {
        soundEngine.playVoiceBark(res.nextNode.voiceBarkKey, { priority: 'normal', cooldownMs: 1200 });
      }
      return;
    }
    if (act === 'open_forge') {
      onClose();
      onOpenForge();
      return;
    }
    if (act === 'enter_charnel_plains') {
      onClose();
      onEnterCharnelPlains();
      return;
    }
    onClose();
  };

  const isLohakara = node.npcId === 'lohakara';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-4 bg-[#070406]/70"
      role="dialog"
      aria-modal="true"
      aria-label={`${node.speakerName} dialogue`}
      data-testid="hub-dialogue-modal"
    >
      <div
        className="w-full max-w-4xl border-2 bg-[#120b0e] shadow-[0_24px_70px_rgba(0,0,0,0.9)] overflow-hidden"
        style={{ borderColor: node.accentHex }}
      >
        {/* Top Ornamental Header Strip */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#1b1114] border-b border-amber-500/25">
          <div className="flex items-center gap-2.5">
            {isLohakara ? (
              <Flame className="w-4 h-4 text-amber-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-300" />
            )}
            <span
              className="text-[11px] font-bold tracking-[0.24em] uppercase"
              style={{ color: node.accentHex }}
            >
              {node.sanskritTag}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            aria-label="Close dialogue"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold tracking-wider uppercase text-stone-300 hover:text-amber-200 border border-stone-700 hover:border-amber-400/60 bg-[#0d080a] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>[ESC] Leave</span>
          </button>
        </div>

        {/* Main Portrait + Dialogue Body */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-0">
          {/* Illustrated Character Portrait */}
          <div className="relative h-48 md:h-auto min-h-[210px] bg-[#0b0608] border-b md:border-b-0 md:border-r border-amber-500/20">
            <Image
              src={node.portraitUrl}
              alt={node.speakerName}
              fill
              sizes="200px"
              referrerPolicy="no-referrer"
              className="object-cover object-top"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0c0709] via-[#0c0709]/80 to-transparent px-3.5 py-3">
              <div className="text-lg font-bold tracking-wide text-amber-100">
                {node.speakerName}
              </div>
              <div className="text-[11px] text-amber-300/80 leading-tight">
                {node.speakerTitle}
              </div>
            </div>
          </div>

          {/* Dialogue Text + Branching Choices */}
          <div className="p-5 md:p-6 flex flex-col justify-between gap-5">
            <p
              className="text-[15px] md:text-base leading-relaxed text-stone-100 font-serif tracking-[0.01em]"
              data-testid="hub-dialogue-text"
            >
              “{node.text}”
            </p>

            <div className="flex flex-col gap-2">
              {node.choices.map((choice, idx) => {
                const isPrimary =
                  choice.action === 'open_forge' || choice.action === 'enter_charnel_plains';
                return (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => handleChoice(choice.id)}
                    className={`group flex items-center justify-between text-left px-4 py-2.5 border transition-colors cursor-pointer ${
                      isPrimary
                        ? 'bg-amber-950/55 border-amber-400/70 hover:bg-amber-900/70 text-amber-100'
                        : 'bg-[#1a1014] border-stone-700/80 hover:border-amber-400/60 hover:bg-[#24161b] text-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 text-[11px] font-bold border border-amber-500/40 bg-[#0d080a] text-amber-300"
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-sm font-semibold leading-snug">{choice.label}</div>
                        {choice.sublabel && (
                          <div className="text-[11px] text-amber-300/75 tracking-wide">
                            {choice.sublabel}
                          </div>
                        )}
                      </div>
                    </div>
                    {choice.action === 'enter_charnel_plains' ? (
                      <Compass className="w-4 h-4 text-emerald-300 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    ) : choice.action === 'open_forge' ? (
                      <Flame className="w-4 h-4 text-amber-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-amber-300 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
