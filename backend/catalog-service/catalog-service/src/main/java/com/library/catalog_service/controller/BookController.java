package com.library.catalog_service.controller;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.library.catalog_service.model.Book;
import com.library.catalog_service.repository.BookRepository;
import com.library.catalog_service.service.S3Service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@RestController
@RequestMapping("/api/catalog/books")
public class BookController {
    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private S3Service s3Service;

    @GetMapping
    public Page<Book> getAllBooks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return bookRepository.findAll(pageable);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Book> getBookById(@PathVariable Long id) {
        Optional<Book> book = bookRepository.findById(id);
        return book.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('librarian') or hasRole('admin')")
    public ResponseEntity<Book> createBook(
            @RequestParam("title") String title,
            @RequestParam("author") String author,
            @RequestParam("isbn") String isbn,
            @RequestParam("availableCopies") Integer availableCopies,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        Book book = new Book(title, author, isbn, availableCopies);

        try {
            if (file != null && !file.isEmpty()) {
                String imageUrl = s3Service.uploadFile(file);
                book.setCoverImageUrl(imageUrl);
            }
            return ResponseEntity.ok(bookRepository.save(book));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('librarian') or hasRole('admin') or hasRole('reader')")
    public ResponseEntity<Book> updateBooik(
            @PathVariable Long id,
            @RequestParam("title") String title,
            @RequestParam("author") String author,
            @RequestParam("isbn") String isbn,
            @RequestParam("availableCopies") Integer availableCopies,
            @RequestParam(value = "file", required = false) MultipartFile file) {

        Optional<Book> optionalBook = bookRepository.findById(id);

        if (optionalBook.isPresent()) {
            Book existingBook = optionalBook.get();
            existingBook.setTitle(title);
            existingBook.setAuthor(author);
            existingBook.setIsbn(isbn);
            existingBook.setAvailableCopies(availableCopies);

            try {
                if (file != null && !file.isEmpty()) {
                    String imageUrl = s3Service.uploadFile(file);
                    existingBook.setCoverImageUrl(imageUrl);
                }
                Book updatedBook = bookRepository.save(existingBook);
                return ResponseEntity.ok(updatedBook);
            } catch (Exception e) {
                return ResponseEntity.internalServerError().build();
            }
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('librarian') or hasRole('admin')")
    public ResponseEntity<Void> deleteBook(@PathVariable Long id) {
        Optional<Book> optionalBook = bookRepository.findById(id);
        if (optionalBook.isPresent()) {
            Book book = optionalBook.get();
            if (book.getCoverImageUrl() != null) {
                s3Service.deleteFile(book.getCoverImageUrl());
            }
            bookRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

}

// teraz ogarnąć uploadowanie obrazu w reatcie i przetestować czy sie uploaduje
// do S3