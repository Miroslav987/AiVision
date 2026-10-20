// src/app/page.tsx
"use client";
import React, { useRef } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/shared/Header";
import { ToastContainer } from "@/components/shared/ToastContainer";
import type { VideoStageRef } from "@/components/video/VideoStage";

const VideoStageWrap = dynamic(() => import("@/components/video/VideoStage").then(m => m.VideoStage), { ssr: false });
const PlaybackControlsWrap = dynamic(() => import("@/components/video/PlaybackControls").then(m => m.PlaybackControls), { ssr: false });
const SourcePickerWrap = dynamic(() => import("@/components/video/SourcePicker").then(m => m.SourcePicker), { ssr: false });
const AnalysisTabsWrap = dynamic(() => import("@/components/analysis/AnalysisTabs").then(m => m.AnalysisTabs), { ssr: false });
const ModelPanelWrap = dynamic(() => import("@/components/model/ModelPanel").then(m => m.ModelPanel), { ssr: false });
const IntegrationEngineWrap = dynamic(() => import("@/components/IntegrationEngine").then(m => m.IntegrationEngine), { ssr: false });
const DevPanelWrap = dynamic(() => import("@/components/dev/DevPanel").then(m => m.DevPanel), { ssr: false });

export default function DashboardPage() {
  const videoStageRef = useRef<VideoStageRef>(null);
  
  // Для того чтобы SourcePicker и Capture могли обратиться напрямую к тегу <video>
  const videoRefProxy = {
    get current() { return videoStageRef.current?.video || null; }
  } as React.RefObject<HTMLVideoElement | null>;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-bg-base">
      <Header />
      <ToastContainer />
      <IntegrationEngineWrap videoRef={videoRefProxy} />
      <DevPanelWrap />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-2 lg:p-4 gap-4">
        <section className="flex-[6.5] min-w-0 flex flex-col gap-4 overflow-hidden">
          <div className="hidden lg:flex flex-col gap-3 shrink-0">
            <SourcePickerWrap videoRef={videoRefProxy} />
            <PlaybackControlsWrap videoRef={videoRefProxy} onSnapshot={() => videoStageRef.current?.captureSnapshot()} />
          </div>
          <div className="flex-1 min-h-0">
            <AnalysisTabsWrap videoNode={<VideoStageWrap ref={videoStageRef} />} />
          </div>
        </section>

        <section className="flex-[3.5] min-w-0 flex flex-col overflow-hidden">
          <ModelPanelWrap />
        </section>
      </main>
    </div>
  );
}