package com.library.catalog_service.controller;

import org.springframework.beans.factory.annotation.Value;
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
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import java.util.Map;
import java.util.HashMap;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

@RestController
@RequestMapping("/api/catalog/books")
public class BookController {
    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private S3Service s3Service;

    @Value("${app.analytics-service.url}")
    private String analyticsServiceUrl;

    @GetMapping
    public Page<Book> getAllBooks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search) { // <-- Dodany parametr

        Pageable pageable = PageRequest.of(page, size);

        // Jeśli bibliotekarz coś wpisał, szukamy po tytule lub autorze
        if (search != null && !search.trim().isEmpty()) {
            return bookRepository.findByTitleContainingIgnoreCaseOrAuthorContainingIgnoreCase(search, search, pageable);
        }

        // Jeśli pole jest puste, zwracamy standardową listę
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
            @AuthenticationPrincipal Jwt jwt,
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
            Book savedBook = bookRepository.save(book);

            try {
                RestTemplate restTemplate = new RestTemplate();
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                Map<String, Object> metadata = new HashMap<>();
                metadata.put("book_id", savedBook.getId());
                metadata.put("title", savedBook.getTitle());
                metadata.put("isbn", savedBook.getIsbn());
                metadata.put("message", "Dodano nową pozycję w katalogu: " + savedBook.getTitle());

                String username = jwt != null && jwt.getClaimAsString("preferred_username") != null
                        ? jwt.getClaimAsString("preferred_username")
                        : "librarian";

                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("action_type", "BOOK_ADDED");
                requestBody.put("actor_id", username);
                requestBody.put("visibility", "LIBRARIAN");
                requestBody.put("metadata", metadata);

                HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
                restTemplate.postForLocation(analyticsServiceUrl + "/internal/logs", request);
            } catch (Exception ex) {
                System.out.println("Błąd wysyłania logu do analytics-service: " + ex.getMessage());
            }

            return ResponseEntity.ok(savedBook);
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

    @PostMapping("/{id}/mark-lost")
    @PreAuthorize("hasRole('librarian') or hasRole('admin')")
    public ResponseEntity<Book> markBookAsLostOrDamaged(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") int count) {

        Optional<Book> optionalBook = bookRepository.findById(id);
        if (optionalBook.isPresent()) {
            Book book = optionalBook.get();
            if (book.getAvailableCopies() >= count) {
                book.setAvailableCopies(book.getAvailableCopies() - count);
                Book savedBook = bookRepository.save(book);

                try {
                    RestTemplate restTemplate = new RestTemplate();
                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.APPLICATION_JSON);

                    Map<String, Object> metadata = new HashMap<>();
                    metadata.put("book_id", savedBook.getId());
                    metadata.put("title", savedBook.getTitle());
                    metadata.put("lost_count", count);
                    metadata.put("message", "Zgłoszono zniszczenie lub zagubienie książki: " + savedBook.getTitle());

                    String username = jwt != null && jwt.getClaimAsString("preferred_username") != null
                            ? jwt.getClaimAsString("preferred_username")
                            : "librarian";

                    Map<String, Object> requestBody = new HashMap<>();
                    requestBody.put("action_type", "BOOK_LOST_OR_DAMAGED");
                    requestBody.put("actor_id", username);
                    requestBody.put("visibility", "LIBRARIAN");
                    requestBody.put("metadata", metadata);

                    HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
                    restTemplate.postForLocation("http://analytics-service:8000/internal/logs", request);
                } catch (Exception ex) {
                    System.out.println("Błąd wysyłania logu do analytics-service: " + ex.getMessage());
                }

                return ResponseEntity.ok(savedBook);
            } else {
                return ResponseEntity.badRequest().build();
            }
        }
        return ResponseEntity.notFound().build();
    }
}

// teraz ogarnąć uploadowanie obrazu w reatcie i przetestować czy sie uploaduje
// do S3