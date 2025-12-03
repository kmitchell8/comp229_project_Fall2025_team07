// Library.jsx - Improved version
import React, { useEffect, useState } from 'react'
import './Library.css'
import bookApi from '../Api/bookApi'
import { useAuth } from '../authState/useAuth'

const Library = () => {
  const [bookShelves, setBookShelves] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { getToken } = useAuth()

  useEffect(() => {
    const loadBooks = async () => {
      try {
        setLoading(true)
        setError(null)
        const books = await bookApi.list()
        
        if (!Array.isArray(books)) {
          throw new Error('Invalid response format')
        }

        if (books.length === 0) {
          setBookShelves({})
          setLoading(false)
          return
        }

        // Group books by genre
        const groupedBooks = books.reduce((acc, book) => {
          // Normalize genre (capitalize first letter, handle variations)
          const genre = book.genre 
            ? book.genre.charAt(0).toUpperCase() + book.genre.slice(1).toLowerCase()
            : 'Unknown'
          
          if (!acc[genre]) {
            acc[genre] = []
          }
          
          // Store the full book object, not just the title
          acc[genre].push({
            id: book._id,
            title: (book.title || 'Untitled book').trim(),
            author: book.author ? book.author.trim() : null,
            cover: book.cover
          })
          
          return acc
        }, {})

        setBookShelves(groupedBooks)
      } catch (error) {
        console.error('Error loading books:', error)
        setError(error.message || 'Failed to load books')
      } finally {
        setLoading(false)
      }
    }

    loadBooks()
  }, [])

  const handleDelete = async (bookId) => {
    if (!window.confirm('Are you sure you want to delete this book?')) {
      return
    }

    try {
      await bookApi.deleteOne(bookId, getToken)
      
      const books = await bookApi.list()
      
      if (!Array.isArray(books)) {
        throw new Error('Invalid response format')
      }

      if (books.length === 0) {
        setBookShelves({})
        return
      }

      // Regroup books by genre
      const groupedBooks = books.reduce((acc, book) => {
        const genre = book.genre 
          ? book.genre.charAt(0).toUpperCase() + book.genre.slice(1).toLowerCase()
          : 'Unknown'
        
        if (!acc[genre]) {
          acc[genre] = []
        }
        
        acc[genre].push({
          id: book._id,
          title: (book.title || 'Untitled book').trim(),
          author: book.author ? book.author.trim() : null,
          cover: book.cover
        })
        
        return acc
      }, {})

      setBookShelves(groupedBooks)
    } catch (error) {
      console.error('Error deleting book:', error)
      alert(`Failed to delete book: ${error.message}`)
    }
  }

  if (loading) {
    return <div className="library">Loading books...</div>
  }

  if (error) {
    return <div className="library">Error: {error}</div>
  }

  if (Object.keys(bookShelves).length === 0) {
    return <div className="library">No books found in the library.</div>
  }

  return (
    <div className="library">
      {Object.entries(bookShelves).map(([genre, books]) => (
        <section key={genre} className="library__section">
          <h4>{genre}</h4>
          <div className="library__list">
            {books.map((book) => (
              <p key={book.id} className="library__book-item">
                <span className="library__book-title">{book.title}</span>
                {book.author && (
                  <span className="library__book-author"> by {book.author}</span>
                )}
                <button 
                  className="library__delete-button"
                  onClick={() => handleDelete(book.id)}
                  type="button"
                >
                  Delete
                </button>
              </p>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default Library