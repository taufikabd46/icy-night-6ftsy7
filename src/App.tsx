import React, { useState, useEffect, useCallback } from 'react';

// Define TypeScript Interfaces based on API response
interface Book {
    id: number;
    bookName: string;
    writerName: string;
    writerDeath: string | null;
    bookSlug: string;
    hadiths_count: string; // API returns string
    chapters_count: string; // API returns string
}

interface Chapter {
    id: number;
    chapterNumber: string; // API returns string
    chapterEnglish: string;
    chapterUrdu: string; // Not used in UI but present in API
    chapterArabic: string;
    bookSlug: string;
}

interface Hadith {
    id: number;
    hadithNumber: string; // API returns string
    englishNarrator: string;
    hadithEnglish: string;
    hadithUrdu: string; // Not used in UI but present in API
    hadithArabic?: string; // API sometimes omits this, make optional
    headingArabic?: string; // Present in some hadith structures, make optional
    headingUrdu?: string; // Present in some hadith structures, make optional
    headingEnglish?: string; // Present in some hadith structures, make optional
    chapterId: string; // API returns string
    bookSlug: string;
    volume: string; // API returns string
    status: string;
    book: {
        id: number;
        bookName: string;
        writerName: string;
        writerDeath: string | null;
        bookSlug: string;
    };
    chapter: {
        id: number;
        chapterNumber: string;
        chapterEnglish: string;
        chapterUrdu: string; // Not used in UI
        chapterArabic: string;
        bookSlug: string;
    };
}

interface BookApiResponse {
    status: number;
    message: string;
    books: Book[];
}

interface ChapterApiResponse {
    status: number;
    message: string;
    chapters: Chapter[];
}

interface HadithApiResponse {
    status: number;
    message: string;
    hadiths: {
        current_page: number;
        data: Hadith[];
        first_page_url: string;
        from: number;
        last_page: number;
        last_page_url: string;
        links: any[]; // Define more specific type if needed
        next_page_url: string | null;
        path: string;
        per_page: number;
        prev_page_url: string | null;
        to: number;
        total: number;
    };
}

const API_KEY = '$2y$10$mtPFXQXHOGR70dSo5NAznuYs1edXL2OL4WDUslltPKcZGOSimpgC';
const BASE_URL = 'https://hadithapi.com/api';

const HadithApp: React.FC = () => {
    const [books, setBooks] = useState<Book[]>([]);
    const [selectedBook, setSelectedBook] = useState<Book | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
    const [hadithsData, setHadithsData] = useState<HadithApiResponse['hadiths'] | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [loadingBooks, setLoadingBooks] = useState<boolean>(true);
    const [loadingChapters, setLoadingChapters] = useState<boolean>(false);
    const [loadingHadiths, setLoadingHadiths] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

    // Fetch Books
    useEffect(() => {
        const fetchBooks = async () => {
            setLoadingBooks(true);
            setError(null);
            try {
                const response = await fetch(`${BASE_URL}/books?apiKey=${API_KEY}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data: BookApiResponse = await response.json();
                if (data.status === 200) {
                    // Filter out books with 0 hadiths count as they might not have hadith data accessible via standard endpoints
                    const availableBooks = data.books.filter(book => parseInt(book.hadiths_count) > 0);
                    setBooks(availableBooks);
                } else {
                    throw new Error(data.message || 'Failed to fetch books');
                }
            } catch (err) {
                console.error("Error fetching books:", err);
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setLoadingBooks(false);
            }
        };
        fetchBooks();
    }, []);

    // Fetch Chapters when a book is selected
    useEffect(() => {
        if (!selectedBook) {
            setChapters([]);
            setSelectedChapter(null);
            setHadithsData(null);
            return;
        }
        const fetchChapters = async () => {
            setLoadingChapters(true);
            setChapters([]); // Clear previous chapters
            setSelectedChapter(null); // Reset selected chapter
            setHadithsData(null); // Clear hadiths
            setError(null);
            try {
                const response = await fetch(`${BASE_URL}/${selectedBook.bookSlug}/chapters?apiKey=${API_KEY}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data: ChapterApiResponse = await response.json();
                 if (data.status === 200 && data.chapters) {
                    setChapters(data.chapters);
                } else if (data.status === 404 || !data.chapters) {
                     console.warn(`No chapters found for ${selectedBook.bookName} or endpoint incorrect.`);
                     setError(`No chapters found for ${selectedBook.bookName}.`);
                     setChapters([]);
                 }
                 else {
                    throw new Error(data.message || 'Failed to fetch chapters');
                }
            } catch (err) {
                console.error("Error fetching chapters:", err);
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setLoadingChapters(false);
            }
        };
        fetchChapters();
    }, [selectedBook]);

    // Fetch Hadiths when book, chapter, or page changes
    const fetchHadiths = useCallback(async () => {
        if (!selectedBook || !selectedChapter) {
             setHadithsData(null);
             return;
        }

        setLoadingHadiths(true);
        setError(null);
        try {
            const response = await fetch(`${BASE_URL}/hadiths?apiKey=${API_KEY}&book=${selectedBook.bookSlug}&chapter=${selectedChapter.chapterNumber}&paginate=25&page=${currentPage}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: HadithApiResponse = await response.json();
            if (data.status === 200 && data.hadiths) {
                 // Ensure hadiths data is an array before setting
                if (Array.isArray(data.hadiths.data)) {
                    setHadithsData(data.hadiths);
                } else {
                    console.warn("Received hadiths data is not an array:", data.hadiths.data);
                    // Handle cases where data might be empty or malformed, perhaps set to empty array
                    setHadithsData({ ...data.hadiths, data: [] });
                     setError(`No hadiths found for this chapter or page.`);
                }

            } else {
                 console.warn(`No hadiths found or error for ${selectedBook.bookName} - Chapter ${selectedChapter.chapterNumber}: ${data.message}`);
                 setHadithsData(null); // Clear hadiths if request failed or no data
                 setError(data.message || `No hadiths found for Chapter ${selectedChapter.chapterNumber}.`);
            }
        } catch (err) {
            console.error("Error fetching hadiths:", err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
            setHadithsData(null); // Clear hadiths on error
        } finally {
            setLoadingHadiths(false);
        }
    }, [selectedBook, selectedChapter, currentPage]);

    useEffect(() => {
        fetchHadiths();
    }, [fetchHadiths]);


    // Handlers
    const handleBookSelect = (book: Book) => {
        setSelectedBook(book);
        setSelectedChapter(null); // Reset chapter selection
        setCurrentPage(1); // Reset page
        setHadithsData(null); // Clear hadiths
        setIsSidebarOpen(false); // Close sidebar on mobile after selection
    };

    const handleChapterSelect = (chapter: Chapter) => {
        setSelectedChapter(chapter);
        setCurrentPage(1); // Reset page
        setHadithsData(null); // Clear hadiths before fetching new ones
    };

     const handlePageChange = (page: number) => {
        if (page > 0 && (!hadithsData || page <= hadithsData.last_page)) {
            setCurrentPage(page);
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* Sidebar */}
            <aside className={`bg-gradient-to-b from-teal-700 to-teal-900 text-white w-64 space-y-6 py-7 px-2 absolute inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out z-30 shadow-lg overflow-y-auto`}>
                <h2 className="text-2xl font-semibold text-center mb-6 px-4">Hadith Books</h2>
                {loadingBooks ? (
                    <div className="px-4 text-center text-gray-300">Loading Books...</div>
                ) : error && books.length === 0 ? (
                     <div className="px-4 text-center text-red-300">{error}</div>
                ): (
                    <nav>
                        {books.map((book) => (
                            <button
                                key={book.id}
                                onClick={() => handleBookSelect(book)}
                                className={`w-full text-left block py-2.5 px-4 rounded transition duration-200 ${selectedBook?.id === book.id ? 'bg-teal-600' : 'hover:bg-teal-800 hover:text-white'}`}
                            >
                                {book.bookName} ({book.hadiths_count})
                            </button>
                        ))}
                    </nav>
                )}
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <header className="bg-white shadow-md p-4 flex items-center justify-between">
                     {/* Mobile Sidebar Toggle */}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="text-gray-600 focus:outline-none md:hidden"
                        aria-label="Toggle sidebar"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                    <h1 className="text-xl font-semibold text-gray-700">
                         {selectedBook ? selectedBook.bookName : 'Hadith Collection'}
                         {selectedChapter ? ` - Ch ${selectedChapter.chapterNumber}: ${selectedChapter.chapterEnglish}` : ''}
                    </h1>
                    <div>{/* Placeholder for potential actions */}</div>
                </header>

                {/* Content Area */}
                 <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
                    {error && (
                       <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                          <strong className="font-bold">Error: </strong>
                          <span className="block sm:inline">{error}</span>
                       </div>
                    )}

                    {!selectedBook && !loadingBooks && (
                        <div className="text-center text-gray-500 mt-10">
                            <p className="text-lg">Please select a book from the sidebar to view chapters and hadiths.</p>
                        </div>
                    )}

                    {selectedBook && (
                        <>
                            {/* Chapter Selection */}
                            {!selectedChapter && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-4 text-gray-700">Chapters in {selectedBook.bookName}</h3>
                                    {loadingChapters ? (
                                        <div className="text-center text-gray-500">Loading Chapters...</div>
                                    ) : chapters.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {chapters.map((chapter) => (
                                                <button
                                                    key={chapter.id}
                                                    onClick={() => handleChapterSelect(chapter)}
                                                    className="bg-white p-4 rounded shadow hover:shadow-md transition duration-150 text-left border border-gray-200"
                                                >
                                                    <p className="font-medium text-teal-700">Ch {chapter.chapterNumber}</p>
                                                    <p className="text-sm text-gray-600">{chapter.chapterEnglish}</p>
                                                    <p className="text-sm text-gray-500 mt-1" dir="rtl">{chapter.chapterArabic}</p>
                                                </button>
                                            ))}
                                        </div>
                                     ) : !loadingChapters && !error ? ( // Added check for no error
                                         <div className="text-center text-gray-500 mt-10">No chapters available for this book.</div>
                                     ) : null}
                                </div>
                            )}

                            {/* Hadith Display */}
                            {selectedChapter && (
                                <div>
                                    {loadingHadiths ? (
                                        <div className="text-center text-gray-500 py-10">Loading Hadiths...</div>
                                    ) : hadithsData && hadithsData.data.length > 0 ? (
                                        <div className="space-y-6">
                                            {hadithsData.data.map((hadith) => (
                                                <div key={hadith.id} className="bg-white p-5 rounded-lg shadow border border-gray-200">
                                                    <div className="mb-3 pb-2 border-b border-gray-200">
                                                         <span className="font-semibold text-teal-700">Hadith #{hadith.hadithNumber}</span>
                                                         <span className="text-sm text-gray-500 ml-2">({hadith.status})</span>
                                                         <p className="text-sm text-gray-600 mt-1">Narrated by: {hadith.englishNarrator}</p>
                                                    </div>

                                                    {/* Arabic Text */}
                                                    {hadith.hadithArabic && (
                                                        <p className="text-xl leading-loose font-serif text-right text-gray-800 mb-4" dir="rtl">
                                                            {hadith.hadithArabic}
                                                        </p>
                                                    )}

                                                    {/* Translation (Using English as placeholder for Indonesian) */}
                                                    <p className="text-base text-gray-700 mb-1">
                                                      <span className="font-semibold text-teal-800">Translation:</span>
                                                    </p>
                                                     <p className="text-base text-gray-700">
                                                        {hadith.hadithEnglish}
                                                    </p>
                                                </div>
                                            ))}

                                            {/* Pagination */}
                                            {hadithsData.last_page > 1 && (
                                                <div className="flex justify-center items-center space-x-2 mt-6">
                                                    <button
                                                        onClick={() => handlePageChange(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                        className="px-4 py-2 bg-teal-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-700 transition duration-150"
                                                    >
                                                        Previous
                                                    </button>
                                                    <span className="text-gray-700">
                                                        Page {currentPage} of {hadithsData.last_page}
                                                    </span>
                                                    <button
                                                        onClick={() => handlePageChange(currentPage + 1)}
                                                        disabled={currentPage === hadithsData.last_page}
                                                        className="px-4 py-2 bg-teal-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-700 transition duration-150"
                                                    >
                                                        Next
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : !loadingHadiths && !error ? ( // Added check for no error
                                        <div className="text-center text-gray-500 py-10">No hadiths found for this chapter.</div>
                                     ) : null}
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default HadithApp;