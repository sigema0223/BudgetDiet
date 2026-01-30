# BudgetDiet

Document analysis and budget management application

## Project Structure

```
root/
├── .cursorrules                # Cursor AI behavior guidelines
├── README.md                   # Project documentation
├── tsconfig.json               # TypeScript configuration (strict: true)
├── package.json                # Project dependency management
│
├── convex/                     # 🚀 Backend Core (Convex)
│   ├── schema.ts               # [Data] Database tables and type definitions (Zod-like)
│   │
│   ├── domain/                 # [Pure] Pure business logic (no dependencies)
│   │   ├── types/
│   │   │   ├── result.ts       # Result<T, E> union type
│   │   │   └── analysis.ts     # Analysis result domain interfaces
│   │   ├── entities/
│   │   │   └── document.ts     # Document domain model class/type
│   │   └── services/
│   │       ├── llm.interface.ts # ILLMClient interface
│   │       └── repo.interface.ts# IRepository interface
│   │
│   ├── infrastructure/         # [Detail] External tool implementations
│   │   ├── llm/
│   │   │   ├── openai.client.ts # OpenAI API integration implementation
│   │   │   └── mock.client.ts   # Mock client for testing
│   │   └── utils/
│   │       ├── pdf.parser.ts    # PDF text extraction logic
│   │       └── logger.ts         # System logging utility
│   │
│   ├── application/            # [Flow] Use case orchestration
│   │   └── use-cases/
│   │       └── analyze_doc.ts   # "Extract -> Analyze -> Save" flow orchestration
│   │
│   ├── documents.ts            # [Entry: DB] Queries & Mutations (Data Access)
│   └── actions.ts              # [Entry: API] Actions (External API & Async)
│
└── src/                        # 🎨 Frontend (Next.js/React)
    ├── api/                    # Convex client configuration
    ├── components/             # UI components (Upload, ResultView, etc.)
    ├── hooks/                 # Custom hooks using useQuery, useAction
    └── App.tsx                 # Main screen
```

## Architecture Overview

### Backend (Convex)

- **Domain Layer**: Pure business logic, no external dependencies
- **Infrastructure Layer**: External API and utility implementations
- **Application Layer**: Use case orchestration
- **Entry Points**: 
  - `documents.ts`: Database queries and mutations
  - `actions.ts`: External API calls and async operations

### Frontend (Next.js/React)

- **Components**: Reusable UI components
- **Hooks**: Custom hooks for interacting with Convex
- **API**: Convex client configuration

## Tech Stack

- **Backend**: Convex
- **Frontend**: Next.js, React, TypeScript
- **AI**: OpenAI API
- **Language**: TypeScript (strict mode)

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## Development Guide

- Use TypeScript strict mode
- Follow Clean Architecture principles
- Separate domain logic from infrastructure
- Dependency inversion through interfaces

---

# BudgetDiet (한국어)

문서 분석 및 예산 관리 애플리케이션

## 프로젝트 구조

```
root/
├── .cursorrules                # Cursor AI의 행동 지침
├── README.md                   # 프로젝트 문서화
├── tsconfig.json               # TypeScript 설정 (strict: true)
├── package.json                # 프로젝트 의존성 관리
│
├── convex/                     # 🚀 Backend Core (Convex)
│   ├── schema.ts               # [Data] DB 테이블 및 타입 정의 (Zod-like)
│   │
│   ├── domain/                 # [Pure] 순수 비즈니스 로직 (의존성 없음)
│   │   ├── types/
│   │   │   ├── result.ts       # Result<T, E> 유니온 타입
│   │   │   └── analysis.ts     # 분석 결과 도메인 인터페이스
│   │   ├── entities/
│   │   │   └── document.ts     # 문서 도메인 모델 클래스/타입
│   │   └── services/
│   │       ├── llm.interface.ts # ILLMClient 인터페이스
│   │       └── repo.interface.ts# IRepository 인터페이스
│   │
│   ├── infrastructure/         # [Detail] 외부 도구 구현부
│   │   ├── llm/
│   │   │   ├── openai.client.ts # OpenAI API 연동 실제 코드
│   │   │   └── mock.client.ts   # 테스트용 가짜 클라이언트
│   │   └── utils/
│   │       ├── pdf.parser.ts    # PDF 텍스트 추출 로직
│   │       └── logger.ts         # 시스템 로그 유틸
│   │
│   ├── application/            # [Flow] 유스케이스 오케스트레이션
│   │   └── use-cases/
│   │       └── analyze_doc.ts   # "추출->분석->저장" 전체 흐름 제어
│   │
│   ├── documents.ts            # [Entry: DB] Queries & Mutations (Data Access)
│   └── actions.ts              # [Entry: API] Actions (External API & Async)
│
└── src/                        # 🎨 Frontend (Next.js/React)
    ├── api/                    # Convex 클라이언트 설정
    ├── components/             # UI (Upload, ResultView 등)
    ├── hooks/                 # useQuery, useAction 활용 커스텀 훅
    └── App.tsx                 # 메인 화면
```

## 아키텍처 개요

### Backend (Convex)

- **Domain Layer**: 순수 비즈니스 로직, 외부 의존성 없음
- **Infrastructure Layer**: 외부 API 및 유틸리티 구현
- **Application Layer**: 유스케이스 오케스트레이션
- **Entry Points**: 
  - `documents.ts`: 데이터베이스 쿼리 및 뮤테이션
  - `actions.ts`: 외부 API 호출 및 비동기 작업

### Frontend (Next.js/React)

- **Components**: 재사용 가능한 UI 컴포넌트
- **Hooks**: Convex와의 상호작용을 위한 커스텀 훅
- **API**: Convex 클라이언트 설정

## 기술 스택

- **Backend**: Convex
- **Frontend**: Next.js, React, TypeScript
- **AI**: OpenAI API
- **Language**: TypeScript (strict mode)

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

## 개발 가이드

- TypeScript strict 모드 사용
- Clean Architecture 원칙 준수
- 도메인 로직과 인프라스트럭처 분리
- 인터페이스를 통한 의존성 역전

