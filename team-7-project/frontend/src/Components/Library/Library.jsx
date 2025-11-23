import React, { useEffect, useState } from 'react'
import './Library.css'
import bookApi from '../Api/bookApi'

const listOfBooks = {
  Fiction: ['Placeholder Novel A', 'Placeholder Novel B'],
  NonFiction: ['Placeholder Memoir A', 'Placeholder Essay B'],
  Mystery: ['Placeholder Mystery A', 'Placeholder Mystery B'],
  Fantasy: ['Placeholder Fantasy A', 'Placeholder Fantasy B'],
  Classics: ['Placeholder Classic A', 'Placeholder Classic B'],
}

const Library = () => {
  const [bookShelves, setBookShelves] = useState(listOfBooks)

  useEffect(() => {
    const loadBooks = async () => {
      try {
        const books = await bookApi.list()
        if (!Array.isArray(books) || books.length === 0) {
          return
        }

        const groupedBooks = books.reduce((acc, book) => {
          const genre = book.genre || 'Unknown'
          if (!acc[genre]) acc[genre] = []
          acc[genre].push(book.title || 'Untitled book')
          return acc
        }, {})

        setBookShelves(groupedBooks)
      } catch (error) {
        console.warn('Book list not found:', error.message)
      }
    }

    loadBooks()
  }, [])

  return (
    <div className="library">
      {Object.entries(bookShelves).map(([genre, titles]) => (
        <section key={genre} className="library__section">
          <h4>{genre}</h4>
          <div className="library__list">
            {titles.map((title, idx) => (
              <p key={`${genre}-${idx}`} className="library__book-item">
                <span className="library__book-title">{title}</span>
                <span className="library__delete-button">delete</span>
              </p>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default Library