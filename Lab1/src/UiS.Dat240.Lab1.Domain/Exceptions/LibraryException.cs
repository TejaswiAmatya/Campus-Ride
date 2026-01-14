using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace UiS.Dat240.Lab1.Domain.Exceptions;

/// <summary>
/// Base exception for library-specific errors.
/// You can use this or standard exceptions like ArgumentException and InvalidOperationException.
/// </summary>
public class LibraryException : Exception
{
    public LibraryException(string message) : base(message)
    {
    }

    public LibraryException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}