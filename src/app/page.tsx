'use client';

import React, { useState, useEffect } from 'react';
import { useMockAuth, MOCK_USERS } from '@/client/auth-context';
import { useI18n } from '@/i18n/I18nProvider';
import { Locale } from '@/i18n/catalog';
import {
  useCourses,
  useFeed,
  useSavedList,
  useSavePostMutation,
  useUnsavePostMutation,
  useDeletePostMutation,
} from '@/client/hooks';
import type { PostSummary } from '@/client/hooks';
import {
  Bookmark,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Globe,
  User,
  AlertCircle,
  HelpCircle,
  Sun,
  Moon,
} from 'lucide-react';

export default function Home() {
  const { currentUser, setCurrentUser, isLoading: authLoading } = useMockAuth();
  const { locale, setLocale, t } = useI18n();

  // Navigation tabs: 'feed' | 'saved'
  const [activeTab, setActiveTab] = useState<'feed' | 'saved'>('feed');

  // Active course ID selection (for the feed)
  const [activeCourseId, setActiveCourseId] = useState<string>('');

  // Pagination states
  const [feedPage, setFeedPage] = useState<number>(1);
  const [savedPage, setSavedPage] = useState<number>(1);
  const LIMIT = 5;

  // Dark/Light Theme Switcher State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';

    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (saved === 'dark' || saved === 'light') return saved;

    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  // Update theme class on HTML element
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // API hooks
  const { data: courses, isLoading: coursesLoading, error: coursesError } = useCourses();
  const selectedCourseId = activeCourseId || courses?.[0]?.id || '';
  
  // Fetch feed posts when feed tab is active and course is selected
  const {
    data: feedPageData,
    isLoading: feedLoading,
    error: feedError,
  } = useFeed(selectedCourseId, feedPage, LIMIT);

  // Fetch saved posts when saved tab is active
  const {
    data: savedPageData,
    isLoading: savedLoading,
    error: savedError,
  } = useSavedList(savedPage, LIMIT);

  const saveMutation = useSavePostMutation();
  const unsaveMutation = useUnsavePostMutation();
  const deleteMutation = useDeletePostMutation();
  const feedPosts = feedPageData?.items ?? [];
  const savedPosts = savedPageData?.items ?? [];


  // Handle bookmark click
  const handleBookmarkToggle = async (postId: string, hasSaved: boolean) => {
    try {
      if (hasSaved) {
        await unsaveMutation.mutateAsync(postId);
      } else {
        await saveMutation.mutateAsync(postId);
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    }
  };

  // Handle post deletion by moderator
  const handleDeletePost = async (postId: string) => {
    if (window.confirm(t('confirmDelete'))) {
      try {
        await deleteMutation.mutateAsync(postId);
      } catch (err) {
        console.error('Error deleting post:', err);
      }
    }
  };

  // Render post skeleton loader
  const renderSkeletons = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {[1, 2, 3].map((n) => (
        <div key={n} className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line-last" />
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Premium Header */}
      <header className="header-glass">
        <div className="header-content">
          <div className="logo-group">
            <BookOpen className="logo-icon" />
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
              {t('title')}
            </h1>
          </div>

          <div className="controls-group">
            {/* Locale Selector */}
            <div className="select-wrapper">
              <Globe style={{ width: '1rem', height: '1rem', color: 'var(--muted)' }} />
              <select
                className="select-control"
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                aria-label="Select language"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
              </select>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="btn-action"
              style={{ width: '2.2rem', height: '2.2rem', borderRadius: '10px' }}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun style={{ width: '1rem', height: '1rem' }} />
              ) : (
                <Moon style={{ width: '1rem', height: '1rem' }} />
              )}
            </button>

            {/* Mock User Selector */}
            <div className="select-wrapper">
              <User style={{ width: '1rem', height: '1rem', color: 'var(--muted)' }} />
              <select
                className="select-control"
                value={currentUser.id}
                onChange={(e) => {
                  const selected = MOCK_USERS.find((u) => u.id === e.target.value);
                  if (selected) {
                    setFeedPage(1);
                    setSavedPage(1);
                    setActiveCourseId('');
                    setCurrentUser(selected);
                  }
                }}
                aria-label="Switch acting user"
              >
                {MOCK_USERS.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-container">
        {/* Navigation Tabs */}
        <nav className="tabs-nav">
          <button
            className={`tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            {t('allPosts')}
          </button>
          <button
            className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            {t('bookmarkedPosts')}
          </button>
        </nav>

        {authLoading ? (
          renderSkeletons()
        ) : activeTab === 'feed' ? (
          /* FEED TAB */
          <div className="main-layout">
            {/* Sidebar for Course Selector */}
            <aside className="sidebar">
              <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
                {t('filterByCourse')}
              </h3>

              {coursesLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div className="skeleton" style={{ height: '2rem', borderRadius: '8px' }} />
                  <div className="skeleton" style={{ height: '2rem', borderRadius: '8px' }} />
                </div>
              ) : coursesError ? (
                <div className="card-premium" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <AlertCircle style={{ width: '1.25rem', height: '1.25rem' }} />
                  <span style={{ fontSize: '0.85rem' }}>{coursesError.message}</span>
                </div>
              ) : (
                <div className="course-list">
                  {courses?.map((course: { id: string; name: string }) => (
                    <button
                      key={course.id}
                      onClick={() => {
                        setActiveCourseId(course.id);
                        setFeedPage(1);
                      }}
                      className={`course-btn ${selectedCourseId === course.id ? 'active' : ''}`}
                    >
                      {course.name}
                    </button>
                  ))}
                  {courses?.length === 0 && (
                    <div style={{ color: 'var(--muted)', fontSize: '0.85rem', padding: '0.5rem' }}>
                      No courses enrolled.
                    </div>
                  )}
                </div>
              )}
            </aside>

            {/* Feed Posts */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {feedError ? (
                <div className="card-premium" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <AlertCircle style={{ width: '1.25rem', height: '1.25rem' }} />
                  <span>{feedError.message}</span>
                </div>
              ) : feedLoading ? (
                renderSkeletons()
              ) : feedPosts.length === 0 ? (
                <div className="card-premium empty-state">
                  <HelpCircle className="empty-icon" />
                  <p className="empty-text">{t('emptyFeed')}</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {feedPosts.map((post: PostSummary) => (
                      <article key={post.id} className="card-premium card-post">
                        <div className="post-header">
                          <h2 className="post-title">{post.title}</h2>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {/* Bookmark Toggle */}
                            <button
                              onClick={() => handleBookmarkToggle(post.id, post.hasSaved)}
                              className={`btn-action btn-bookmark ${post.hasSaved ? 'saved' : ''}`}
                              title={post.hasSaved ? t('bookmarked') : t('bookmark')}
                              aria-label={post.hasSaved ? t('bookmarked') : t('bookmark')}
                            >
                              <Bookmark
                                style={{
                                  width: '1.25rem',
                                  height: '1.25rem',
                                  fill: post.hasSaved ? 'currentColor' : 'none',
                                }}
                              />
                            </button>
                            {/* Moderator Delete Control */}
                            {currentUser.role === 'moderator' && (
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                className="btn-action btn-delete"
                                title={t('removePost')}
                                aria-label={t('removePost')}
                              >
                                <Trash2 style={{ width: '1.2rem', height: '1.2rem' }} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="post-content">{post.content}</p>
                        <div className="post-footer">
                          <span className="post-author">
                            <User style={{ width: '0.85rem', height: '0.85rem', marginInlineEnd: '0.25rem' }} />
                            {post.authorId}
                          </span>
                          <span className="save-count">
                            <Bookmark style={{ width: '0.85rem', height: '0.85rem', fill: 'currentColor' }} />
                            {t('saves', post.savesCount)}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  <div className="pagination">
                    <button
                      className="btn-pagination"
                      disabled={feedPage === 1}
                      onClick={() => setFeedPage((p) => p - 1)}
                    >
                      <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
                      {t('previous')}
                    </button>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)' }}>
                      {t('page', feedPage)}
                    </span>
                    <button
                      className="btn-pagination"
                      disabled={!feedPageData?.hasNextPage}
                      onClick={() => setFeedPage((p) => p + 1)}
                    >
                      {t('next')}
                      <ChevronRight style={{ width: '1rem', height: '1rem' }} />
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        ) : (
          /* SAVED TAB */
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {savedError ? (
              <div className="card-premium" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertCircle style={{ width: '1.25rem', height: '1.25rem' }} />
                <span>{savedError.message}</span>
              </div>
            ) : savedLoading ? (
              renderSkeletons()
            ) : savedPosts.length === 0 ? (
              <div className="card-premium empty-state">
                <Bookmark className="empty-icon" />
                <p className="empty-text">{t('emptySaved')}</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {savedPosts.map((post: PostSummary) => (
                    <article key={post.id} className="card-premium card-post">
                      <div className="post-header">
                        <h2 className="post-title">{post.title}</h2>
                        <button
                          onClick={() => handleBookmarkToggle(post.id, post.hasSaved)}
                          className={`btn-action btn-bookmark ${post.hasSaved ? 'saved' : ''}`}
                          title={t('bookmarked')}
                          aria-label={t('bookmarked')}
                        >
                          <Bookmark
                            style={{
                              width: '1.25rem',
                              height: '1.25rem',
                              fill: 'currentColor',
                            }}
                          />
                        </button>
                      </div>
                      <p className="post-content">{post.content}</p>
                      <div className="post-footer">
                        <span className="post-author">
                          <User style={{ width: '0.85rem', height: '0.85rem', marginInlineEnd: '0.25rem' }} />
                          {post.authorId}
                        </span>
                        <span className="save-count">
                          <Bookmark style={{ width: '0.85rem', height: '0.85rem', fill: 'currentColor' }} />
                          {t('saves', post.savesCount)}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Pagination Controls */}
                <div className="pagination">
                  <button
                    className="btn-pagination"
                    disabled={savedPage === 1}
                    onClick={() => setSavedPage((p) => p - 1)}
                  >
                    <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
                    {t('previous')}
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)' }}>
                    {t('page', savedPage)}
                  </span>
                  <button
                    className="btn-pagination"
                    disabled={!savedPageData?.hasNextPage}
                    onClick={() => setSavedPage((p) => p + 1)}
                  >
                    {t('next')}
                    <ChevronRight style={{ width: '1rem', height: '1rem' }} />
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </>
  );
}
